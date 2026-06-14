const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/db');
const { validateRow } = require('./importValidator');

/**
 * Scan CSV rows for unique payer and participant names,
 * ensure they are registered globally, and add them to the group if missing.
 */
async function autoEnrollCsvMembers(client, groupId, rows) {
  const uniqueNames = new Set();
  
  for (let row of rows) {
    const paidByVal = row.PaidBy || row.paidBy || row.paid_by || row.Paid_By || row.PAID_BY;
    if (paidByVal && paidByVal.trim()) {
      uniqueNames.add(paidByVal.trim());
    }
    
    const participantsStr = row.participants || row.Participants || row.split_with || row.split_with || '';
    if (participantsStr) {
      const parts = participantsStr.split(/[;,]/);
      for (let p of parts) {
        if (p.trim()) {
          uniqueNames.add(p.trim());
        }
      }
    }
  }
  
  if (uniqueNames.size === 0) return;
  
  // Fetch existing users
  const usersRes = await client.query('SELECT id, email, first_name, last_name FROM users');
  const userMap = new Map();
  usersRes.rows.forEach(u => {
    userMap.set(u.email.toLowerCase().trim(), u.id);
    if (u.first_name) {
      userMap.set(u.first_name.toLowerCase().trim(), u.id);
    }
    if (u.first_name && u.last_name) {
      userMap.set(`${u.first_name} ${u.last_name}`.toLowerCase().trim(), u.id);
    }
  });

  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Password123!', salt);

  for (let name of uniqueNames) {
    const norm = name.toLowerCase().trim();
    let userId;
    
    if (userMap.has(norm)) {
      userId = userMap.get(norm);
    } else {
      // Create user globally
      const email = `${name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@example.com`;
      
      // Double check email availability
      const checkEmail = await client.query('SELECT id FROM users WHERE email = $1', [email]);
      if (checkEmail.rows.length > 0) {
        userId = checkEmail.rows[0].id;
      } else {
        const parts = name.split(/\s+/);
        const firstName = parts[0];
        const lastName = parts.slice(1).join(' ') || parts[0];
        
        const insRes = await client.query(
          'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
          [firstName, lastName, email, hashedPassword]
        );
        userId = insRes.rows[0].id;
        console.log(`Auto-created user globally: ${name} (ID: ${userId})`);
      }
      
      // Update local maps
      userMap.set(norm, userId);
      userMap.set(email, userId);
    }
    
    // Ensure active membership in the group
    const memberRes = await client.query(
      "SELECT id FROM memberships WHERE group_id = $1 AND user_id = $2 AND status = 'ACTIVE'",
      [groupId, userId]
    );
    if (memberRes.rows.length === 0) {
      await client.query(
        "INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, 'ACTIVE')",
        [groupId, userId]
      );
      console.log(`Auto-added user ${name} to Group ID: ${groupId}`);
    }
  }
}

/**
 * Handle CSV processing using streams.
 * Parses, validates, and stores into import_jobs and import_anomalies.
 */
async function processCsvFile(filePath, groupId, uploaderId, originalFileName) {
  const client = await db.pool.connect();
  let jobId = null;
  
  try {
    await client.query('BEGIN');

    // 1. Create Job
    const jobRes = await client.query(
      `INSERT INTO import_jobs (group_id, uploaded_by_id, file_name, status) 
       VALUES ($1, $2, $3, 'PROCESSING') RETURNING id`,
      [groupId, uploaderId, originalFileName]
    );
    jobId = jobRes.rows[0].id;

    // 2. Process Stream
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    // 3. Auto-enroll CSV members in the group so we don't fail validation
    await autoEnrollCsvMembers(client, groupId, rows);

    // 4. Fetch active members into a Map for O(1) relational lookups
    const membersRes = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name FROM users u 
       JOIN memberships m ON u.id = m.user_id 
       WHERE m.group_id = $1 AND m.status = 'ACTIVE'`,
      [groupId]
    );
    
    const activeUsersMap = new Map();
    membersRes.rows.forEach(m => {
      activeUsersMap.set(m.email.toLowerCase().trim(), m.id);
      if (m.first_name) {
        activeUsersMap.set(m.first_name.toLowerCase().trim(), m.id);
      }
      if (m.first_name && m.last_name) {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase().trim();
        activeUsersMap.set(fullName, m.id);
      }
    });

    let totalRows = rows.length;
    let failedRows = 0;
    let successfulRows = 0;

    // 5. Validate and Insert Anomalies
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1; // 1-indexed for user-friendliness
      const row = rows[i];
      const anomalies = validateRow(row, activeUsersMap);

      if (anomalies.length > 0) {
        // Find highest severity
        const isCritical = anomalies.some(a => a.severity === 'CRITICAL');
        if (isCritical) failedRows++;
        else successfulRows++;
        
        // We log the first critical error or the first warning
        const primaryAnomaly = anomalies.find(a => a.severity === 'CRITICAL') || anomalies[0];
        
        await client.query(
          `INSERT INTO import_anomalies (job_id, row_number, raw_data, anomaly_code, message, severity, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'UNRESOLVED')`,
          [jobId, rowNum, JSON.stringify(row), primaryAnomaly.code, primaryAnomaly.message, primaryAnomaly.severity]
        );
      } else {
        // Valid row!
        successfulRows++;
        await client.query(
          `INSERT INTO import_anomalies (job_id, row_number, raw_data, anomaly_code, message, severity, status)
           VALUES ($1, $2, $3, 'OK', 'Valid row', 'WARNING', 'RESOLVED')`,
          [jobId, rowNum, JSON.stringify(row)]
        );
      }
    }

    // 6. Update Job status
    const finalStatus = failedRows > 0 ? 'FAILED' : 'PENDING';
    await client.query(
      `UPDATE import_jobs SET status = $1, total_rows = $2, successful_rows = $3, failed_rows = $4 WHERE id = $5`,
      [finalStatus, totalRows, successfulRows, failedRows, jobId]
    );

    await client.query('COMMIT');
    
    // Clean up temp file
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return jobId;

  } catch (err) {
    if (client) await client.query('ROLLBACK');
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    throw err;
  } finally {
    if (client) client.release();
  }
}

module.exports = { processCsvFile };

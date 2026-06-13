const fs = require('fs');
const csv = require('csv-parser');
const db = require('../config/db');
const { validateRow } = require('./importValidator');

/**
 * Handle CSV processing using streams.
 * Parses, validates, and stores into import_jobs and import_anomalies.
 */
async function processCsvFile(filePath, groupId, uploaderId, originalFileName) {
  const client = await db.pool.connect();
  let jobId = null;
  
  try {
    // 1. Fetch active members into a Map for O(1) relational lookups
    const membersRes = await client.query(
      `SELECT u.id, u.email FROM users u 
       JOIN memberships m ON u.id = m.user_id 
       WHERE m.group_id = $1 AND m.status = 'ACTIVE'`,
      [groupId]
    );
    const activeUsersMap = new Map();
    membersRes.rows.forEach(m => activeUsersMap.set(m.email.toLowerCase(), m.id));

    await client.query('BEGIN');

    // 2. Create Job
    const jobRes = await client.query(
      `INSERT INTO import_jobs (group_id, uploaded_by_id, file_name, status) 
       VALUES ($1, $2, $3, 'PROCESSING') RETURNING id`,
      [groupId, uploaderId, originalFileName]
    );
    jobId = jobRes.rows[0].id;

    // 3. Process Stream
    const rows = [];
    await new Promise((resolve, reject) => {
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => rows.push(data))
        .on('end', resolve)
        .on('error', reject);
    });

    let totalRows = rows.length;
    let failedRows = 0;
    let successfulRows = 0;

    // 4. Validate and Insert Anomalies
    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 1; // 1-indexed for user-friendliness
      const row = rows[i];
      const anomalies = validateRow(row, activeUsersMap);

      if (anomalies.length > 0) {
        // Find highest severity
        const isCritical = anomalies.some(a => a.severity === 'CRITICAL');
        if (isCritical) failedRows++;
        else successfulRows++; // Warnings don't count as failed rows natively, but require review
        
        // We log the first critical error or the first warning
        const primaryAnomaly = anomalies.find(a => a.severity === 'CRITICAL') || anomalies[0];
        
        await client.query(
          `INSERT INTO import_anomalies (job_id, row_number, raw_data, anomaly_code, message, severity, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'UNRESOLVED')`,
          [jobId, rowNum, JSON.stringify(row), primaryAnomaly.code, primaryAnomaly.message, primaryAnomaly.severity]
        );
      } else {
        // Valid row! Store in anomalies with a generic 'VALID' code so we have a unified staging table
        successfulRows++;
        await client.query(
          `INSERT INTO import_anomalies (job_id, row_number, raw_data, anomaly_code, message, severity, status)
           VALUES ($1, $2, $3, 'OK', 'Valid row', 'NONE', 'RESOLVED')`,
          [jobId, rowNum, JSON.stringify(row)]
        );
      }
    }

    // 5. Update Job status
    const finalStatus = failedRows > 0 || (successfulRows > 0 && rows.length > 0) ? 'REVIEW_REQUIRED' : 'COMPLETED';
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

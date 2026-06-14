const db = require('../config/db');
const { processCsvFile } = require('../services/csvParser');

/**
 * Helper to parse custom date format (DD-MM-YYYY, DD/MM/YYYY) or standard formats
 */
const parseCustomDate = (dateStr) => {
  if (!dateStr) return null;
  const dmyRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
  const match = dateStr.trim().match(dmyRegex);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed in JS Date
    const year = parseInt(match[3], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
};

/**
 * Step 1: Upload and Dry Run
 * @route POST /api/v1/groups/:id/import
 */
const uploadCsv = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a CSV file.' });
    }

    const groupId = req.params.id;
    const uploaderId = req.user.id;
    const filePath = req.file.path;
    const originalFileName = req.file.originalname;

    const jobId = await processCsvFile(filePath, groupId, uploaderId, originalFileName);

    res.status(202).json({
      success: true,
      message: 'File parsed and staged. Please review the import report.',
      data: { import_id: jobId },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 2: View Import Report
 * @route GET /api/v1/imports/:importId/report
 */
const getImportReport = async (req, res, next) => {
  try {
    const importId = req.params.importId || req.params.jobId;

    const jobRes = await db.query('SELECT * FROM import_jobs WHERE id = $1', [importId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Import job not found' });
    }

    const job = jobRes.rows[0];

    const anomaliesRes = await db.query(
      'SELECT * FROM import_anomalies WHERE job_id = $1 ORDER BY row_number ASC',
      [importId]
    );

    // Transform anomalies into frontend-expected row format
    const rows = anomaliesRes.rows.map(a => {
      const row = a.raw_data || {};
      const descVal = row.Desc || row.desc || row.Description || row.description || '';
      const amountVal = row.Amount || row.amount || 0;
      const currencyVal = row.Currency || row.currency || 'USD';
      const dateVal = row.Date || row.date || '';

      return {
        row_number: a.row_number,
        description: descVal,
        amount: amountVal,
        currency: currencyVal,
        date: dateVal,
        status: a.anomaly_code === 'OK' ? 'success' : a.severity === 'WARNING' ? 'warning' : 'error',
        errors: a.severity === 'CRITICAL' ? [a.message] : [],
        warnings: (a.severity === 'WARNING' && a.anomaly_code !== 'OK') ? [a.message] : [],
      };
    });

    res.status(200).json({
      success: true,
      data: {
        job: {
          id: job.id,
          file_name: job.file_name,
          status: job.status,
          total_rows: job.total_rows,
          successful_rows: job.successful_rows,
          failed_rows: job.failed_rows,
        },
        rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 3: Commit the Import
 * @route POST /api/v1/groups/:id/imports/:jobId/commit
 */
const commitImport = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const jobId = req.params.jobId;
    const groupId = req.params.id;
    const committerId = req.user.id;

    const jobRes = await client.query('SELECT * FROM import_jobs WHERE id = $1 AND group_id = $2 FOR UPDATE', [jobId, groupId]);
    if (jobRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Job not found' });
    if (jobRes.rows[0].status === 'COMPLETED') return res.status(400).json({ success: false, message: 'Job already completed' });

    await client.query('BEGIN');

    // Fetch members with names to build a robust resolution map
    const membersRes = await client.query(
      `SELECT u.id, u.email, u.first_name, u.last_name FROM users u 
       JOIN memberships m ON u.id = m.user_id 
       WHERE m.group_id = $1 AND m.status = 'ACTIVE'`,
      [groupId]
    );

    const userMap = new Map();
    membersRes.rows.forEach(m => {
      userMap.set(m.email.toLowerCase().trim(), m.id);
      if (m.first_name) {
        userMap.set(m.first_name.toLowerCase().trim(), m.id);
      }
      if (m.first_name && m.last_name) {
        const fullName = `${m.first_name} ${m.last_name}`.toLowerCase().trim();
        userMap.set(fullName, m.id);
      }
    });

    // We select all rows that do not have CRITICAL errors (allowing warnings to be committed)
    const validRowsRes = await client.query(
      `SELECT * FROM import_anomalies WHERE job_id = $1 AND severity != 'CRITICAL'`,
      [jobId]
    );

    if (validRowsRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'No valid rows to commit.' });
    }

    let insertedCount = 0;
    for (let rowObj of validRowsRes.rows) {
      const row = rowObj.raw_data;
      const paidByStr = row.PaidBy || row.paid_by || '';
      let paidById = userMap.get(paidByStr.toLowerCase().trim());
      
      // Fallback: If payer is empty, assign it to the committer/uploader
      if (!paidById) {
        paidById = committerId;
      }

      const amountVal = row.Amount || row.amount;
      const amount = parseFloat(amountVal);
      const descVal = row.Desc || row.description || row.desc || 'Imported Expense';
      const currencyVal = row.Currency || row.currency || 'USD';
      const dateVal = row.Date || row.date || '';

      const parsedDate = parseCustomDate(dateVal);
      const dbDate = parsedDate && !isNaN(parsedDate.getTime()) ? parsedDate.toISOString() : new Date().toISOString();

      if (amount < 0) {
        // Negative amount (refund)
        const absAmount = Math.abs(amount);

        // Insert expense with absolute amount
        const newExp = await client.query(
          `INSERT INTO expenses 
          (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
          VALUES ($1, $2, $3, $4, $5, 1.0, 'EQUAL', $6) RETURNING id`,
          [groupId, paidById, descVal, absAmount, currencyVal, dbDate]
        );

        // Determine participants list
        const participantsStr = row.participants || row.Participants || row.split_with || row.split_with || '';
        let targetMembers = [];

        if (participantsStr) {
          const parts = participantsStr.split(/[;,]/);
          for (let p of parts) {
            const trimmed = p.trim().toLowerCase();
            if (trimmed && userMap.has(trimmed)) {
              const userId = userMap.get(trimmed);
              if (!targetMembers.some(m => m.id === userId)) {
                const dbMember = membersRes.rows.find(m => m.id === userId);
                if (dbMember) targetMembers.push(dbMember);
              }
            }
          }
        }

        if (targetMembers.length === 0) {
          targetMembers = membersRes.rows;
        }

        // Ensure the payer is in targetMembers for math consistency
        if (!targetMembers.some(m => m.id === paidById)) {
          const payerMember = membersRes.rows.find(m => m.id === paidById);
          if (payerMember) targetMembers.push(payerMember);
        }

        const N = targetMembers.length;
        for (let m of targetMembers) {
          let calculatedAmount;
          if (m.id === paidById) {
            // Payer: positive amount representing inverted split contribution
            calculatedAmount = (absAmount * (2 * N - 1)) / N;
          } else {
            // Others: negative amount representing credit
            calculatedAmount = -absAmount / N;
          }

          calculatedAmount = parseFloat(calculatedAmount.toFixed(2));
          await client.query(
            `INSERT INTO expense_participants (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base)
             VALUES ($1, $2, $3, $4, $5)`,
            [newExp.rows[0].id, m.id, calculatedAmount, calculatedAmount, calculatedAmount]
          );
        }
      } else if (amount === 0) {
        // Zero amount: Store as 0.01 dummy to satisfy db check constraint
        const dummyAmount = 0.01;
        const newExp = await client.query(
          `INSERT INTO expenses 
          (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
          VALUES ($1, $2, $3, $4, $5, 1.0, 'EQUAL', $6) RETURNING id`,
          [groupId, paidById, descVal, dummyAmount, currencyVal, dbDate]
        );

        // Entire split allocated to the payer so others have 0 effect
        await client.query(
          `INSERT INTO expense_participants (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base)
           VALUES ($1, $2, 0.01, 0.01, 0.01)`,
          [newExp.rows[0].id, paidById]
        );
      } else {
        // Normal positive amount expense
        const newExp = await client.query(
          `INSERT INTO expenses 
          (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
          VALUES ($1, $2, $3, $4, $5, 1.0, 'EQUAL', $6) RETURNING id`,
          [groupId, paidById, descVal, amount, currencyVal, dbDate]
        );

        // Determine participants list
        const participantsStr = row.participants || row.Participants || row.split_with || row.split_with || '';
        let targetMembers = [];

        if (participantsStr) {
          const parts = participantsStr.split(/[;,]/);
          for (let p of parts) {
            const trimmed = p.trim().toLowerCase();
            if (trimmed && userMap.has(trimmed)) {
              const userId = userMap.get(trimmed);
              if (!targetMembers.some(m => m.id === userId)) {
                const dbMember = membersRes.rows.find(m => m.id === userId);
                if (dbMember) targetMembers.push(dbMember);
              }
            }
          }
        }

        if (targetMembers.length === 0) {
          targetMembers = membersRes.rows;
        }

        const splitVal = (amount / targetMembers.length).toFixed(2);
        for (let m of targetMembers) {
          await client.query(
            `INSERT INTO expense_participants (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base)
             VALUES ($1, $2, $3, $4, $5)`,
            [newExp.rows[0].id, m.id, splitVal, splitVal, splitVal]
          );
        }
      }
      insertedCount++;
    }

    await client.query(`UPDATE import_jobs SET status = 'COMPLETED', successful_rows = $1 WHERE id = $2`, [insertedCount, jobId]);

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      message: `Successfully committed ${insertedCount} expenses.`,
    });
  } catch (err) {
    if (client) await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  uploadCsv,
  getImportReport,
  commitImport,
};

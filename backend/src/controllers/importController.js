const db = require('../config/db');
const { processCsvFile } = require('../services/csvParser');

/**
 * Step 1: Upload and Dry Run
 * @route POST /api/v1/groups/:id/imports
 */
const uploadCsv = async (req, res, next) => {
   try {
      if (!req.file) {
          return res.status(400).json({ error: 'Please upload a CSV file.' });
      }
      
      const groupId = req.params.id;
      const uploaderId = req.user.id;
      const filePath = req.file.path;
      const originalFileName = req.file.originalname;

      const jobId = await processCsvFile(filePath, groupId, uploaderId, originalFileName);
      
      res.status(202).json({
          message: 'File parsed and staged. Please review the import report.',
          jobId
      });
   } catch(err) {
      next(err);
   }
};

/**
 * Step 2: View Import Report
 * @route GET /api/v1/groups/:id/imports/:jobId
 */
const getImportReport = async (req, res, next) => {
    try {
        const jobId = req.params.jobId;
        const groupId = req.params.id;

        const jobRes = await db.query('SELECT * FROM import_jobs WHERE id = $1 AND group_id = $2', [jobId, groupId]);
        if (jobRes.rows.length === 0) {
            return res.status(404).json({ error: 'Import job not found' });
        }
        
        const anomaliesRes = await db.query(
            "SELECT * FROM import_anomalies WHERE job_id = $1 AND anomaly_code != 'OK' ORDER BY row_number ASC", 
            [jobId]
        );
        
        res.status(200).json({
            job: jobRes.rows[0],
            anomalies: anomaliesRes.rows
        });
    } catch(err) {
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

        // Ensure job is ready
        const jobRes = await client.query('SELECT * FROM import_jobs WHERE id = $1 AND group_id = $2 FOR UPDATE', [jobId, groupId]);
        if (jobRes.rows.length === 0) return res.status(404).json({ error: 'Job not found' });
        if (jobRes.rows[0].status === 'COMPLETED') return res.status(400).json({ error: 'Job already completed' });

        await client.query('BEGIN');

        // Fetch active members to map email to user_id
        const membersRes = await client.query(
            `SELECT u.id, u.email FROM users u 
             JOIN memberships m ON u.id = m.user_id 
             WHERE m.group_id = $1 AND m.status = 'ACTIVE'`,
            [groupId]
        );
        const userMap = new Map();
        membersRes.rows.forEach(m => userMap.set(m.email.toLowerCase(), m.id));

        // Fetch all RESOLVED anomalies (which includes the 'OK' valid rows)
        const validRowsRes = await client.query(
            `SELECT * FROM import_anomalies WHERE job_id = $1 AND status = 'RESOLVED'`,
            [jobId]
        );

        if (validRowsRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'No valid rows to commit. Resolve anomalies first.' });
        }

        // Mass Insert into Expenses
        let insertedCount = 0;
        for (let rowObj of validRowsRes.rows) {
            const row = rowObj.raw_data;
            const paidById = userMap.get(row.PaidBy.toLowerCase().trim());
            const amount = parseFloat(row.Amount);
            
            // Note: In a real scenario we'd split equally among all members dynamically here,
            // but for simplicity, we assume an EQUAL split among all current members.
            const newExp = await client.query(
                `INSERT INTO expenses 
                (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
                VALUES ($1, $2, $3, $4, $5, 1.0, 'EQUAL', $6) RETURNING id`,
                [groupId, paidById, row.Desc, amount, row.Currency || 'USD', row.Date]
            );

            // Insert EQUAL splits for everyone
            const splitVal = (amount / membersRes.rows.length).toFixed(2);
            for (let m of membersRes.rows) {
                await client.query(
                    `INSERT INTO expense_participants (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base)
                     VALUES ($1, $2, $3, $4, $5)`,
                    [newExp.rows[0].id, m.id, splitVal, splitVal, splitVal] // Fixed placeholder bindings count
                );
            }
            insertedCount++;
        }

        // Mark Job Completed
        await client.query(`UPDATE import_jobs SET status = 'COMPLETED' WHERE id = $1`, [jobId]);
        
        // Clean up anomalies table to keep staging area clean
        await client.query(`DELETE FROM import_anomalies WHERE job_id = $1`, [jobId]);

        await client.query('COMMIT');

        res.status(200).json({
            message: `Successfully committed ${insertedCount} expenses.`
        });
    } catch(err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

module.exports = {
    uploadCsv,
    getImportReport,
    commitImport
};

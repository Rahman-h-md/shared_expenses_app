const db = require('../config/db');

/**
 * Create a settlement (payment) between two users
 * @route POST /api/v1/groups/:id/settlements
 */
const createSettlement = async (req, res, next) => {
   try {
     const groupId = req.params.id;
     const { payerId, payeeId, amount, currency, exchangeRateToBase, settlementDate } = req.body;

     if (!payerId || !payeeId || !amount || !currency || !settlementDate) {
         return res.status(400).json({ error: 'Missing required settlement fields' });
     }

     const result = await db.query(
       `INSERT INTO settlements 
       (group_id, payer_id, payee_id, amount, currency, exchange_rate_to_base, settlement_date, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'SETTLED') RETURNING *`,
       [groupId, payerId, payeeId, amount, currency, exchangeRateToBase || 1.0, settlementDate]
     );
     
     res.status(201).json({
         message: 'Settlement logged successfully',
         settlement: result.rows[0]
     });
   } catch(err) {
     next(err);
   }
};

/**
 * Get all settlements for a group
 * @route GET /api/v1/groups/:id/settlements
 */
const getSettlements = async (req, res, next) => {
   try {
     const groupId = req.params.id;
     const result = await db.query(
       `SELECT s.*, p1.first_name as payer_first, p1.last_name as payer_last, 
               p2.first_name as payee_first, p2.last_name as payee_last
        FROM settlements s
        JOIN users p1 ON s.payer_id = p1.id
        JOIN users p2 ON s.payee_id = p2.id
        WHERE s.group_id = $1 ORDER BY s.settlement_date DESC`,
       [groupId]
     );
     
     res.status(200).json(result.rows);
   } catch(err) {
     next(err);
   }
};

module.exports = {
    createSettlement,
    getSettlements
};

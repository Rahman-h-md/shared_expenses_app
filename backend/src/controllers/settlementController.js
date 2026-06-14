const db = require('../config/db');

/**
 * Create a settlement (payment) between two users
 * @route POST /api/v1/groups/:id/settlements
 */
const createSettlement = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    // Support both frontend (snake_case member IDs) and legacy (camelCase user IDs)
    const payerMemberId = req.body.payer_member_id || req.body.payerId;
    const payeeMemberId = req.body.payee_member_id || req.body.payeeId;
    const amount = parseFloat(req.body.amount);
    const currency = req.body.currency || 'USD';
    const notes = req.body.notes || '';
    const settlementDate = req.body.settlement_date || req.body.settlementDate || new Date().toISOString();

    if (!payerMemberId || !payeeMemberId || !amount) {
      return res.status(400).json({ success: false, message: 'Payer, payee, and amount are required' });
    }

    // Resolve membership IDs to user IDs
    const payerRes = await db.query('SELECT user_id FROM memberships WHERE id = $1 AND group_id = $2', [payerMemberId, groupId]);
    const payeeRes = await db.query('SELECT user_id FROM memberships WHERE id = $1 AND group_id = $2', [payeeMemberId, groupId]);

    // Fallback: if not found by membership ID, try using them as user IDs directly
    const payerUserId = payerRes.rows[0]?.user_id || payerMemberId;
    const payeeUserId = payeeRes.rows[0]?.user_id || payeeMemberId;

    const result = await db.query(
      `INSERT INTO settlements 
      (group_id, payer_id, payee_id, amount, currency, exchange_rate_to_base, settlement_date, status) 
      VALUES ($1, $2, $3, $4, $5, 1.0, $6, 'SETTLED') RETURNING *`,
      [groupId, payerUserId, payeeUserId, amount, currency, settlementDate]
    );

    res.status(201).json({
      success: true,
      message: 'Settlement recorded successfully',
      data: result.rows[0],
    });
  } catch (err) {
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
      `SELECT s.id, s.amount, s.currency, s.settlement_date as settled_at, s.status, s.created_at,
              p1.first_name || ' ' || p1.last_name as payer_name,
              p2.first_name || ' ' || p2.last_name as payee_name
       FROM settlements s
       JOIN users p1 ON s.payer_id = p1.id
       JOIN users p2 ON s.payee_id = p2.id
       WHERE s.group_id = $1 
       ORDER BY s.settlement_date DESC`,
      [groupId]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Delete a settlement
 * @route DELETE /api/v1/groups/:id/settlements/:settlementId
 */
const deleteSettlement = async (req, res, next) => {
  try {
    const { id: groupId, settlementId } = req.params;
    const result = await db.query(
      'DELETE FROM settlements WHERE id = $1 AND group_id = $2 RETURNING id',
      [settlementId, groupId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Settlement not found' });
    }
    res.status(200).json({ success: true, message: 'Settlement deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createSettlement,
  getSettlements,
  deleteSettlement,
};

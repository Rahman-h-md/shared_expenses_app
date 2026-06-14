const db = require('../config/db');

/**
 * Create a new expense (with participants)
 * Server-side split calculation for all split types.
 * @route POST /api/v1/groups/:id/expenses
 */
const createExpense = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const groupId = req.params.id;
    // Support both frontend (snake_case) and legacy (camelCase) field names
    const description = req.body.description;
    const totalAmount = parseFloat(req.body.total_amount || req.body.totalAmount);
    const currency = req.body.currency || 'USD';
    const splitType = (req.body.split_type || req.body.splitType || 'equal').toUpperCase();
    const expenseDate = req.body.expense_date || req.body.expenseDate || new Date().toISOString();
    const paidByMemberId = req.body.paid_by_member_id || req.body.paidById;
    const splits = req.body.splits || req.body.participants || [];
    const exchangeRate = parseFloat(req.body.exchange_rate_to_base || req.body.exchangeRateToBase || 1.0);

    if (!description || !totalAmount || !paidByMemberId) {
      return res.status(400).json({ success: false, message: 'Description, amount, and payer are required' });
    }

    // Resolve the user_id from membership id
    const payerMembership = await client.query(
      'SELECT user_id FROM memberships WHERE id = $1 AND group_id = $2',
      [paidByMemberId, groupId]
    );
    if (payerMembership.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid payer member' });
    }
    const paidByUserId = payerMembership.rows[0].user_id;

    await client.query('BEGIN');

    // 1. Insert into expenses
    const expenseRes = await client.query(
      `INSERT INTO expenses 
      (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [groupId, paidByUserId, description, totalAmount, currency, exchangeRate, splitType, expenseDate]
    );
    const newExpense = expenseRes.rows[0];

    // 2. Calculate and insert participant splits
    if (splitType === 'EQUAL') {
      // Resolve all member_ids to user_ids
      const memberIds = splits.map(s => s.member_id);
      const membershipsRes = await client.query(
        'SELECT id, user_id FROM memberships WHERE id = ANY($1) AND group_id = $2',
        [memberIds, groupId]
      );
      const count = membershipsRes.rows.length;
      const shareAmount = parseFloat((totalAmount / count).toFixed(2));

      for (const m of membershipsRes.rows) {
        await client.query(
          `INSERT INTO expense_participants 
          (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base) 
          VALUES ($1, $2, $3, $4, $5)`,
          [newExpense.id, m.user_id, 1, shareAmount, shareAmount * exchangeRate]
        );
      }
    } else {
      // percentage, exact, shares — each split has member_id + value
      let totalShares = 0;
      if (splitType === 'SHARE') {
        totalShares = splits.reduce((acc, s) => acc + (parseFloat(s.value) || 0), 0);
      }

      for (const s of splits) {
        const mRes = await client.query(
          'SELECT user_id FROM memberships WHERE id = $1 AND group_id = $2',
          [s.member_id, groupId]
        );
        if (mRes.rows.length === 0) continue;
        const userId = mRes.rows[0].user_id;

        let calculatedAmount;
        const shareValue = parseFloat(s.value) || 0;

        if (splitType === 'PERCENTAGE') {
          calculatedAmount = parseFloat(((shareValue / 100) * totalAmount).toFixed(2));
        } else if (splitType === 'EXACT') {
          calculatedAmount = shareValue;
        } else if (splitType === 'SHARE') {
          calculatedAmount = totalShares > 0 ? parseFloat(((shareValue / totalShares) * totalAmount).toFixed(2)) : 0;
        }

        await client.query(
          `INSERT INTO expense_participants 
          (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base) 
          VALUES ($1, $2, $3, $4, $5)`,
          [newExpense.id, userId, shareValue, calculatedAmount, calculatedAmount * exchangeRate]
        );
      }
    }

    await client.query('COMMIT');
    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: newExpense,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
};

/**
 * Get all expenses for a group
 * @route GET /api/v1/groups/:id/expenses
 */
const getExpenses = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const limit = parseInt(req.query.limit) || 100;

    const result = await db.query(
      `SELECT e.id, e.description, e.total_amount, e.currency, e.split_type, e.expense_date, e.created_at,
              u.first_name || ' ' || u.last_name as paid_by_name
       FROM expenses e 
       LEFT JOIN users u ON e.paid_by_id = u.id 
       WHERE e.group_id = $1 
       ORDER BY e.expense_date DESC
       LIMIT $2`,
      [groupId, limit]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createExpense,
  getExpenses,
};

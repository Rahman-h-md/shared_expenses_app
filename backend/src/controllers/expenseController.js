const db = require('../config/db');

/**
 * Create a new expense (with participants)
 * @route POST /api/v1/groups/:id/expenses
 */
const createExpense = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const groupId = req.params.id;
    const { 
      paidById, description, totalAmount, currency, 
      exchangeRateToBase, splitType, expenseDate, participants 
    } = req.body;

    if (!description || !totalAmount || !currency || !splitType || !expenseDate || !participants || !paidById) {
       return res.status(400).json({ error: 'Missing required expense fields' });
    }

    await client.query('BEGIN');

    // 1. Insert into expenses
    const expenseRes = await client.query(
      `INSERT INTO expenses 
      (group_id, paid_by_id, description, total_amount, currency, exchange_rate_to_base, split_type, expense_date) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [groupId, paidById, description, totalAmount, currency, exchangeRateToBase || 1.0, splitType, expenseDate]
    );

    const newExpense = expenseRes.rows[0];

    // 2. Insert participants
    // Frontend is expected to calculate the split math to avoid server mismatch
    for (let p of participants) {
       const calcBase = parseFloat(p.calculatedAmountOriginal) * (exchangeRateToBase || 1.0);
       
       await client.query(
         `INSERT INTO expense_participants 
         (expense_id, user_id, share_value, calculated_amount_original, calculated_amount_base) 
         VALUES ($1, $2, $3, $4, $5)`,
         [newExpense.id, p.userId, p.shareValue, p.calculatedAmountOriginal, calcBase]
       );
    }

    await client.query('COMMIT');
    res.status(201).json({
      message: 'Expense created successfully',
      expense: newExpense
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
     
     // Fetch expenses with payer details
     const result = await db.query(
       `SELECT e.*, u.first_name as payer_first_name, u.last_name as payer_last_name 
        FROM expenses e 
        LEFT JOIN users u ON e.paid_by_id = u.id 
        WHERE e.group_id = $1 
        ORDER BY e.expense_date DESC`,
       [groupId]
     );
     
     res.status(200).json(result.rows);
  } catch(err) {
     next(err);
  }
};

module.exports = {
  createExpense,
  getExpenses
};

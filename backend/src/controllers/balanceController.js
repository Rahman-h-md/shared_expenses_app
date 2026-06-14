const { calculateGroupBalances } = require('../services/balanceEngine');
const db = require('../config/db');

/**
 * Get the calculated balances and suggested settlements for a group.
 * Response format matches what the frontend BalanceSummary.jsx expects.
 * @route GET /api/v1/groups/:id/balances
 */
const getGroupBalances = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    // Get the group currency
    const groupRes = await db.query('SELECT base_currency FROM groups WHERE id = $1', [groupId]);
    const groupCurrency = groupRes.rows[0]?.base_currency || 'USD';

    const balanceReport = await calculateGroupBalances(groupId);

    // Get membership IDs for mapping user_id → membership_id
    const membershipsRes = await db.query(
      "SELECT id, user_id FROM memberships WHERE group_id = $1 AND status = 'ACTIVE'",
      [groupId]
    );
    const userToMembership = new Map();
    membershipsRes.rows.forEach(m => userToMembership.set(m.user_id, m.id));

    // Transform to frontend expected format
    const member_balances = balanceReport.individualBalances.map(b => ({
      member_id: userToMembership.get(b.id) || b.id,
      user_id: b.id,
      user_name: `${b.firstName} ${b.lastName}`.trim(),
      net_balance: b.netBalance,
      total_paid: b.totalPaid,
      total_owed: b.totalOwed,
    }));

    const settlements = balanceReport.suggestedSettlements.map(s => ({
      from_member_id: userToMembership.get(s.from) || s.from,
      to_member_id: userToMembership.get(s.to) || s.to,
      from_name: s.fromName,
      to_name: s.toName,
      amount: s.amount,
      currency: groupCurrency,
    }));

    res.status(200).json({
      success: true,
      data: {
        currency: groupCurrency,
        member_balances,
        settlements,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getGroupBalances,
};

const db = require('../config/db');

function simplifyDebts(users) {
  let debtors = [];
  let creditors = [];
  
  // 1. Partition
  for (let user of users) {
    if (user.netBalance <= -0.01) debtors.push({ id: user.id, firstName: user.firstName, lastName: user.lastName, balance: Math.abs(user.netBalance) });
    if (user.netBalance >= 0.01) creditors.push({ id: user.id, firstName: user.firstName, lastName: user.lastName, balance: user.netBalance });
  }

  // 2. Sort (Greedy Max-Flow logic)
  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  let suggestedTransactions = [];
  let i = 0; // debtors index
  let j = 0; // creditors index

  // 3. Greedy Match
  while (i < debtors.length && j < creditors.length) {
    let debtor = debtors[i];
    let creditor = creditors[j];
    
    let amount = Math.min(debtor.balance, creditor.balance);
    
    suggestedTransactions.push({
      from: debtor.id,
      fromName: `${debtor.firstName} ${debtor.lastName}`,
      to: creditor.id,
      toName: `${creditor.firstName} ${creditor.lastName}`,
      amount: parseFloat(amount.toFixed(2))
    });
    
    debtor.balance -= amount;
    creditor.balance -= amount;
    
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }
  
  return suggestedTransactions;
}

async function calculateGroupBalances(groupId) {
  // We use the aggregated subquery approach detailed in the design document
  const ledger = await db.query(`
    SELECT u.id, u.first_name, u.last_name,
      COALESCE((SELECT SUM(total_amount * exchange_rate_to_base) FROM expenses WHERE group_id = $1 AND paid_by_id = u.id), 0) as total_paid,
      COALESCE((SELECT SUM(calculated_amount_base) FROM expense_participants ep JOIN expenses e ON e.id = ep.expense_id WHERE e.group_id = $1 AND ep.user_id = u.id), 0) as total_owed,
      COALESCE((SELECT SUM(amount * exchange_rate_to_base) FROM settlements WHERE group_id = $1 AND payee_id = u.id AND status = 'SETTLED'), 0) as settlements_received,
      COALESCE((SELECT SUM(amount * exchange_rate_to_base) FROM settlements WHERE group_id = $1 AND payer_id = u.id AND status = 'SETTLED'), 0) as settlements_paid
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.group_id = $1 AND m.status = 'ACTIVE'
  `, [groupId]);

  // Calculate net balances for each active user
  const balances = ledger.rows.map(user => {
    const totalPaid = parseFloat(user.total_paid);
    const totalOwed = parseFloat(user.total_owed);
    const settlementsReceived = parseFloat(user.settlements_received);
    const settlementsPaid = parseFloat(user.settlements_paid);
    
    const netBalance = (totalPaid + settlementsPaid) - (totalOwed + settlementsReceived);

    return {
      id: user.id,
      firstName: user.first_name,
      lastName: user.last_name,
      totalPaid,
      totalOwed,
      netBalance: parseFloat(netBalance.toFixed(2))
    };
  });

  const optimalSettlements = simplifyDebts(balances);

  return {
    individualBalances: balances,
    suggestedSettlements: optimalSettlements
  };
}

module.exports = {
  calculateGroupBalances,
  simplifyDebts
};

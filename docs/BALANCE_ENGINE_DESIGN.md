# Balance Calculation Engine Design

This document outlines the core algorithms, mathematical formulas, and settlement optimization (debt simplification) logic that powers the SharePay application.

---

## 1. Mathematical Formulas & Split Algorithms

All calculations are performed using the group's `base_currency` to ensure a unified ledger. 

### 1.1 Base Conversion
Before any split is calculated, the total expense amount must be converted using the transaction-time exchange rate:
$$ \text{Total}_{\text{Base}} = \text{Total}_{\text{Original}} \times \text{ExchangeRate}_{\text{ToBase}} $$

### 1.2 Split Calculations
For an expense with $\text{Total}_{\text{Base}}$ involving $N$ active participants, a user $U$ owes $\text{Owed}_{U}$, calculated based on the `split_type`:

1. **Equal Split**:
   $$ \text{Owed}_{U} = \frac{\text{Total}_{\text{Base}}}{N} $$
2. **Percentage Split**: 
   Where $P_{U}$ is the user's percentage (and $\sum P_{i} = 100$):
   $$ \text{Owed}_{U} = \text{Total}_{\text{Base}} \times \left( \frac{P_{U}}{100} \right) $$
3. **Exact Amount Split**: 
   Where $E_{U}$ is the exact inputted amount (and $\sum E_{i} = \text{Total}_{\text{Base}}$):
   $$ \text{Owed}_{U} = E_{U} $$
4. **Share-Based Split**: 
   Where $S_{U}$ is the user's share count and $\sum S_{i}$ is the total shares of all participants:
   $$ \text{Owed}_{U} = \text{Total}_{\text{Base}} \times \left( \frac{S_{U}}{\sum S_{i}} \right) $$

### 1.3 The Net Balance Formula
To calculate the overall net balance of user $U$ across the entire group history:
$$ \text{NetBalance}_{U} = \sum \text{Paid}_{U} - \sum \text{Owed}_{U} + \sum \text{SettlementsReceived}_{U} - \sum \text{SettlementsPaid}_{U} $$
* A **Positive (+) Balance** means the user is a *Creditor* (they are owed money).
* A **Negative (-) Balance** means the user is a *Debtor* (they owe money).

---

## 2. Member Join/Leave Dates (Temporal Filtering)

When a user selects "Split Equally Among All Members", the engine must dynamically resolve who "all members" were *at the time the expense occurred*.

**Algorithm Rule**:
An expense occurring at $T_{Expense}$ can only include member $U$ if:
$$ T_{Expense} \ge \text{joined\_at}_{U} \quad \text{AND} \quad ( \text{left\_at}_{U} \text{ IS NULL OR } T_{Expense} \le \text{left\_at}_{U} ) $$

If a manual split (Percentage, Exact, Share) explicitly includes a user whose active window does not cover $T_{Expense}$, the engine rejects the transaction and throws an `ERR_MEMBERSHIP_RANGE` exception.

---

## 3. Edge Cases & Arithmetic Handling

1. **The "Lost Penny" Rounding Problem**: 
   Dividing \$100.00 equally among 3 people mathematically yields \$33.3333... Rounding to 2 decimal places yields \$33.33 for everyone, which sums to \$99.99. We lost \$0.01.
   * **Solution**: The engine calculates shares rounded to 2 decimal places. It sums the rounded shares, calculates the difference from the total, and assigns the remainder (the lost pennies) to the user who paid the bill, or the first user in the array.
2. **Zero-Sum Transactions**: Expenses where $\text{Total} \le 0$ are blocked at the database level using `CHECK (total_amount > 0)`.
3. **Frozen Exchange Rates**: The exchange rate is locked at the millisecond the expense is saved. The system *never* recalculates historic $\text{Total}_{\text{Base}}$ amounts using today's live FX rates.

---

## 4. Settlement Optimization Logic (Debt Minimization)

To minimize the number of transactions required to settle the group (e.g., A owes B \$10, B owes C \$10 $\rightarrow$ A simply pays C \$10), the engine implements a Greedy Max-Flow optimization algorithm.

### Algorithm Approach
1. **Aggregate Net Balances**: Compute the `NetBalance` for every user.
2. **Partition**: Separate users into `Debtors` (balance < 0) and `Creditors` (balance > 0). Filter out zero-balance users.
3. **Sort**: Sort Debtors ascending (most negative first). Sort Creditors descending (most positive first).
4. **Greedy Matching**: Iterate while both lists have elements. Take the first Debtor and first Creditor:
   * $\text{SettleAmount} = \min(|\text{Debtor.Balance}|, \text{Creditor.Balance})$
   * Record a suggested settlement: "Debtor pays Creditor SettleAmount"
   * Adjust both balances by SettleAmount.
   * If a user's balance reaches 0, remove them from the list.

### Pseudocode

```javascript
function simplifyDebts(users) {
  let debtors = [];
  let creditors = [];
  
  // 1. Partition
  for (let user of users) {
    if (user.netBalance < 0) debtors.push({ id: user.id, balance: Math.abs(user.netBalance) });
    if (user.netBalance > 0) creditors.push({ id: user.id, balance: user.netBalance });
  }

  // 2. Sort to match largest debts to largest credits first
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
      to: creditor.id,
      amount: parseFloat(amount.toFixed(2))
    });
    
    debtor.balance -= amount;
    creditor.balance -= amount;
    
    if (Math.abs(debtor.balance) < 0.01) i++;
    if (Math.abs(creditor.balance) < 0.01) j++;
  }
  
  return suggestedTransactions;
}
```

---

## 5. Architectural Implementation (Pseudocode)

The actual calculation engine runs as a service in Node.js, compiling the database ledger.

```javascript
async function calculateGroupBalances(groupId) {
  const ledger = await db.query(`
    SELECT u.id,
      COALESCE((SELECT SUM(total_amount * exchange_rate_to_base) FROM expenses WHERE group_id = $1 AND paid_by_id = u.id), 0) as total_paid,
      COALESCE((SELECT SUM(calculated_amount_base) FROM expense_participants ep JOIN expenses e ON e.id = ep.expense_id WHERE e.group_id = $1 AND ep.user_id = u.id), 0) as total_owed,
      COALESCE((SELECT SUM(amount * exchange_rate_to_base) FROM settlements WHERE group_id = $1 AND payee_id = u.id), 0) as settlements_received,
      COALESCE((SELECT SUM(amount * exchange_rate_to_base) FROM settlements WHERE group_id = $1 AND payer_id = u.id), 0) as settlements_paid
    FROM users u
    JOIN memberships m ON u.id = m.user_id
    WHERE m.group_id = $1
  `, [groupId]);

  const balances = ledger.map(user => ({
    id: user.id,
    netBalance: (user.total_paid + user.settlements_received) - (user.total_owed + user.settlements_paid)
  }));

  const optimalSettlements = simplifyDebts(balances);

  return {
    individualBalances: balances,
    suggestedSettlements: optimalSettlements
  };
}
```

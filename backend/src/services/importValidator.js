/**
 * Validates a single parsed CSV row based on the Anomaly Detection Strategy.
 * @param {Object} row The parsed CSV row (e.g., { Date, Amount, Desc, PaidBy, Currency })
 * @param {Map} activeUsersMap A Map of email -> userId for relational checking
 * @returns {Array} List of anomalies found for this row
 */
function validateRow(row, activeUsersMap) {
  const anomalies = [];

  // Required Fields
  if (!row.Date || !row.Amount || !row.Desc || !row.PaidBy) {
    anomalies.push({
      code: 'ERR_MISSING_VAL',
      message: 'Missing one or more required fields (Date, Amount, Desc, PaidBy).',
      severity: 'CRITICAL'
    });
  }

  // Amount Validation
  const amountNum = parseFloat(row.Amount);
  if (!isNaN(amountNum) && amountNum <= 0) {
    anomalies.push({
      code: 'ERR_NEG_AMT',
      message: 'Expenses cannot be zero or negative.',
      severity: 'CRITICAL'
    });
  } else if (isNaN(amountNum) && row.Amount) {
    anomalies.push({
      code: 'ERR_INV_AMT',
      message: 'Amount must be a valid number.',
      severity: 'CRITICAL'
    });
  }

  // Date Validation
  const parsedDate = new Date(row.Date);
  if (row.Date && isNaN(parsedDate.getTime())) {
    anomalies.push({
      code: 'ERR_INV_DATE',
      message: `The date '${row.Date}' could not be parsed.`,
      severity: 'CRITICAL'
    });
  } else if (parsedDate > new Date()) {
    anomalies.push({
      code: 'ERR_INV_DATE',
      message: 'Expense date cannot be in the future.',
      severity: 'CRITICAL'
    });
  }

  // Relational Check: User Exists & is Active
  if (row.PaidBy) {
    const userEmail = row.PaidBy.toLowerCase().trim();
    if (!activeUsersMap.has(userEmail)) {
      anomalies.push({
        code: 'ERR_USER_NOT_FOUND',
        message: `User with email '${userEmail}' is not an active member of this group.`,
        severity: 'CRITICAL'
      });
    }
  }

  // Warning: Settlement Logic
  if (row.Desc) {
    const descLower = row.Desc.toLowerCase();
    if (descLower.includes('settle') || descLower.includes('paid back') || descLower.includes('venmo')) {
      anomalies.push({
        code: 'WRN_SETTLEMENT',
        message: 'Description implies a settlement. Are you sure this is an expense?',
        severity: 'WARNING'
      });
    }
  }

  // Assume other checks (Multi-currency, exact overlaps) would be implemented here in a full app

  return anomalies;
}

module.exports = { validateRow };

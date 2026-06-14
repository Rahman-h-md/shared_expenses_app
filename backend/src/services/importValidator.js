/**
 * Parse a custom date string, supporting DD-MM-YYYY and DD/MM/YYYY formats
 * as well as standard formats.
 */
function parseCustomDate(dateStr) {
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
}

/**
 * Validates a single parsed CSV row based on the Anomaly Detection Strategy.
 * @param {Object} row The parsed CSV row
 * @param {Map} activeUsersMap A Map of email/name -> userId for relational checking
 * @returns {Array} List of anomalies found for this row
 */
function validateRow(row, activeUsersMap) {
  const anomalies = [];

  // Normalize case-insensitive field access
  const dateVal = row.Date || row.date || row.DATE;
  const amountVal = row.Amount || row.amount || row.AMOUNT;
  const descVal = row.Desc || row.desc || row.Description || row.description || row.DESC || row.DESCRIPTION;
  const paidByVal = row.PaidBy || row.paidBy || row.paid_by || row.Paid_By || row.PAID_BY;

  // Required Fields Check (except paidByVal, which we'll auto-fallback on commit)
  if (!dateVal || !amountVal || !descVal) {
    anomalies.push({
      code: 'ERR_MISSING_VAL',
      message: 'Missing one or more required fields (Date, Amount, Description).',
      severity: 'CRITICAL'
    });
  }

  // Handle missing payer as a warning instead of critical error
  if (!paidByVal) {
    anomalies.push({
      code: 'WRN_MISSING_PAYER',
      message: 'Payer is missing. The system will default to the current user (uploader).',
      severity: 'WARNING'
    });
  }

  // Amount Validation
  const amountNum = parseFloat(amountVal);
  if (!isNaN(amountNum) && amountNum < 0) {
    anomalies.push({
      code: 'WRN_NEG_AMT',
      message: 'Negative amount (refund) detected. This will be imported as an inverted split expense.',
      severity: 'WARNING'
    });
  } else if (!isNaN(amountNum) && amountNum === 0) {
    anomalies.push({
      code: 'WRN_ZERO_AMT',
      message: 'Zero amount detected. This will be logged as a dummy 0.01 expense.',
      severity: 'WARNING'
    });
  } else if (isNaN(amountNum) && amountVal) {
    anomalies.push({
      code: 'ERR_INV_AMT',
      message: 'Amount must be a valid number.',
      severity: 'CRITICAL'
    });
  }

  // Date Validation
  const dateParsed = parseCustomDate(dateVal);
  if (dateVal && (!dateParsed || isNaN(dateParsed.getTime()))) {
    anomalies.push({
      code: 'ERR_INV_DATE',
      message: `The date '${dateVal}' could not be parsed.`,
      severity: 'CRITICAL'
    });
  } else if (dateParsed && dateParsed > new Date()) {
    anomalies.push({
      code: 'ERR_INV_DATE',
      message: 'Expense date cannot be in the future.',
      severity: 'CRITICAL'
    });
  }

  // Relational Check: User Exists & is Active (only if provided)
  if (paidByVal) {
    const userEmailOrName = paidByVal.toLowerCase().trim();
    if (!activeUsersMap.has(userEmailOrName)) {
      anomalies.push({
        code: 'ERR_USER_NOT_FOUND',
        message: `User '${paidByVal}' is not an active member of this group.`,
        severity: 'CRITICAL'
      });
    }
  }

  // Warning: Settlement Logic
  if (descVal) {
    const descLower = descVal.toLowerCase();
    if (descLower.includes('settle') || descLower.includes('paid back') || descLower.includes('venmo')) {
      anomalies.push({
        code: 'WRN_SETTLEMENT',
        message: 'Description implies a settlement. Are you sure this is an expense?',
        severity: 'WARNING'
      });
    }
  }

  return anomalies;
}

module.exports = { validateRow };

const express = require('express');
const router = express.Router();

const { createGroup, getGroups, getGroupDetails } = require('../controllers/groupController');
const { addMember, removeMember } = require('../controllers/membershipController');
const { createExpense, getExpenses } = require('../controllers/expenseController');
const { createSettlement, getSettlements } = require('../controllers/settlementController');
const { getGroupBalances } = require('../controllers/balanceController');
const { uploadCsv, getImportReport, commitImport } = require('../controllers/importController');
const auth = require('../middlewares/auth');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Protect all group and membership routes
router.use(auth);

// --- Group Routes ---
// @route   POST /api/v1/groups
router.post('/', createGroup);

// @route   GET /api/v1/groups
router.get('/', getGroups);

// @route   GET /api/v1/groups/:id
router.get('/:id', getGroupDetails);

// --- Membership Routes ---
// @route   POST /api/v1/groups/:id/members
router.post('/:id/members', addMember);

// @route   DELETE /api/v1/groups/:id/members/:userId
router.delete('/:id/members/:userId', removeMember);

// --- Expense Routes ---
// @route   POST /api/v1/groups/:id/expenses
router.post('/:id/expenses', createExpense);

// @route   GET /api/v1/groups/:id/expenses
router.get('/:id/expenses', getExpenses);

// --- Settlement Routes ---
// @route   POST /api/v1/groups/:id/settlements
router.post('/:id/settlements', createSettlement);

// @route   GET /api/v1/groups/:id/settlements
router.get('/:id/settlements', getSettlements);

// --- Balance Route ---
// @route   GET /api/v1/groups/:id/balances
router.get('/:id/balances', getGroupBalances);

// --- CSV Import Routes ---
// @route   POST /api/v1/groups/:id/imports
router.post('/:id/imports', upload.single('file'), uploadCsv);

// @route   GET /api/v1/groups/:id/imports/:jobId
router.get('/:id/imports/:jobId', getImportReport);

// @route   POST /api/v1/groups/:id/imports/:jobId/commit
router.post('/:id/imports/:jobId/commit', commitImport);

module.exports = router;

const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');
const healthRoutes = require('./health');
const auth = require('../middlewares/auth');
const { getImportReport } = require('../controllers/importController');

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);

// Import report route (top-level, outside groups)
router.get('/imports/:importId/report', auth, getImportReport);

module.exports = router;

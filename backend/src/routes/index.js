const express = require('express');
const router = express.Router();

const authRoutes = require('./authRoutes');
const groupRoutes = require('./groupRoutes');
const healthRoutes = require('./health');

// Mount routes
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/groups', groupRoutes);

module.exports = router;

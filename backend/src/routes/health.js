const express = require('express');
const router = express.Router();
const db = require('../config/db');

// @route   GET /api/health
// @desc    Check server and database connectivity
router.get('/', async (req, res, next) => {
  try {
    // Check PostgreSQL connection pool responsiveness
    const dbResult = await db.query('SELECT NOW()');
    
    res.status(200).json({
      success: true,
      message: 'Server is healthy',
      timestamp: new Date(),
      database: {
        connected: true,
        time: dbResult.rows[0].now,
      },
    });
  } catch (err) {
    console.error('Database connection test failed in health check:', err);
    res.status(500).json({
      success: false,
      message: 'Server is running, but database check failed',
      timestamp: new Date(),
      database: {
        connected: false,
        error: err.message,
      },
    });
  }
});

module.exports = router;

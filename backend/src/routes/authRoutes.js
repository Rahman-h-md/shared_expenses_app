const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// @route   POST /api/v1/auth/register
// @desc    Register a user
// @access  Public
router.post('/register', register);

// @route   POST /api/v1/auth/login
// @desc    Login a user
// @access  Public
router.post('/login', login);

module.exports = router;

const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateToken } = require('../config/jwt');

/**
 * Register a new user
 * @route POST /api/v1/auth/register
 * Accepts: { name, email, password }  (name is split into first/last)
 * Also accepts legacy: { firstName, lastName, email, password }
 */
const register = async (req, res, next) => {
  try {
    let { name, firstName, lastName, email, password } = req.body;

    // Support both "name" (frontend) and "firstName"+"lastName" (legacy)
    if (name && !firstName) {
      const parts = name.trim().split(/\s+/);
      firstName = parts[0];
      lastName = parts.slice(1).join(' ') || parts[0]; // fallback: repeat first name if single word
    }

    if (!firstName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name (or firstName/lastName), email, and password.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    // Check if user exists
    const userExists = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user into DB
    const newUser = await db.query(
      'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id, first_name, last_name, email, created_at',
      [firstName, lastName || firstName, email, hashedPassword]
    );

    const user = newUser.rows[0];

    // Generate JWT — payload must be an object so req.user.id works in middleware
    const token = generateToken({ id: user.id, email: user.email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login user
 * @route POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    // Find user
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const user = result.rows[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Generate JWT — payload must be an object so req.user.id works in middleware
    const token = generateToken({ id: user.id, email: user.email });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        name: `${user.first_name} ${user.last_name}`.trim(),
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        created_at: user.created_at,
      },
      token,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
};

const db = require('../config/db');

/**
 * Create a new group
 * @route POST /api/v1/groups
 */
const createGroup = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    const { name, description, baseCurrency } = req.body;
    const userId = req.user.id; // From auth middleware

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    await client.query('BEGIN');

    // Insert Group
    const groupResult = await client.query(
      'INSERT INTO groups (name, description, base_currency, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, baseCurrency || 'USD', userId]
    );
    const group = groupResult.rows[0];

    // Automatically add creator as a member
    await client.query(
      'INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)',
      [group.id, userId, 'ACTIVE']
    );

    await client.query('COMMIT');

    res.status(201).json({
      message: 'Group created successfully',
      group
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

/**
 * Get all groups for the authenticated user
 * @route GET /api/v1/groups
 */
const getGroups = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await db.query(
      `SELECT g.*, m.joined_at, m.status as membership_status 
       FROM groups g 
       JOIN memberships m ON g.id = m.group_id 
       WHERE m.user_id = $1 AND m.status = 'ACTIVE'`,
      [userId]
    );

    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
};

/**
 * Get group details (including members)
 * @route GET /api/v1/groups/:id
 */
const getGroupDetails = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const userId = req.user.id;

    // Check if user is part of the group
    const membershipCheck = await db.query(
      'SELECT * FROM memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, userId]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Access denied. You are not a member of this group.' });
    }

    const groupResult = await db.query('SELECT * FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    const membersResult = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.email, m.joined_at, m.left_at, m.status
       FROM users u
       JOIN memberships m ON u.id = m.user_id
       WHERE m.group_id = $1`,
      [groupId]
    );

    res.status(200).json({
      ...groupResult.rows[0],
      members: membersResult.rows
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupDetails
};

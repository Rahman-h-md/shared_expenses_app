const db = require('../config/db');

/**
 * Create a new group
 * @route POST /api/v1/groups
 */
const createGroup = async (req, res, next) => {
  const client = await db.pool.connect();
  try {
    // Support both 'currency' (frontend) and 'baseCurrency' (legacy)
    const { name, description, currency, baseCurrency } = req.body;
    const userId = req.user.id;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Group name is required' });
    }

    const groupCurrency = currency || baseCurrency || 'USD';

    await client.query('BEGIN');

    // Insert Group
    const groupResult = await client.query(
      'INSERT INTO groups (name, description, base_currency, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, description || null, groupCurrency, userId]
    );
    const group = groupResult.rows[0];

    // Automatically add creator as a member
    await client.query(
      'INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, $3)',
      [group.id, userId, 'ACTIVE']
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Group created successfully',
      data: {
        id: group.id,
        name: group.name,
        description: group.description,
        currency: group.base_currency,
        created_by: group.created_by,
        created_at: group.created_at,
      },
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
      `SELECT g.id, g.name, g.description, g.base_currency as currency, g.created_at,
              COUNT(m2.id) as member_count
       FROM groups g 
       JOIN memberships m ON g.id = m.group_id 
       LEFT JOIN memberships m2 ON g.id = m2.group_id AND m2.status = 'ACTIVE'
       WHERE m.user_id = $1 AND m.status = 'ACTIVE'
       GROUP BY g.id
       ORDER BY g.created_at DESC`,
      [userId]
    );

    res.status(200).json({
      success: true,
      data: result.rows,
    });
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
      "SELECT * FROM memberships WHERE group_id = $1 AND user_id = $2 AND status = 'ACTIVE'",
      [groupId, userId]
    );

    if (membershipCheck.rows.length === 0) {
      return res.status(403).json({ success: false, message: 'Access denied. You are not a member of this group.' });
    }

    const groupResult = await db.query('SELECT id, name, description, base_currency as currency, created_by, created_at FROM groups WHERE id = $1', [groupId]);
    if (groupResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Group not found' });
    }

    res.status(200).json({
      success: true,
      data: groupResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createGroup,
  getGroups,
  getGroupDetails,
};


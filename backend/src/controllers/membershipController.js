const db = require('../config/db');

/**
 * Add a member to a group
 * @route POST /api/v1/groups/:id/members
 */
const addMember = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'User email is required to add member' });
    }

    // 1. Find user by email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found. They must register first.' });
    }
    const newMemberId = userResult.rows[0].id;

    // 2. Check if already a member
    const membershipCheck = await db.query(
      "SELECT * FROM memberships WHERE group_id = $1 AND user_id = $2 AND status = 'ACTIVE'",
      [groupId, newMemberId]
    );

    if (membershipCheck.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'User is already an active member of this group' });
    }

    // 3. Insert membership
    const newMembership = await db.query(
      'INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, $3) RETURNING *',
      [groupId, newMemberId, 'ACTIVE']
    );

    res.status(201).json({
      success: true,
      message: 'Member added successfully',
      data: newMembership.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get members of a group
 * @route GET /api/v1/groups/:id/members
 */
const getMembers = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    const result = await db.query(
      `SELECT m.id, m.user_id, m.joined_at, m.left_at, m.status,
              u.first_name || ' ' || u.last_name as user_name,
              u.email as user_email,
              CASE WHEN g.created_by = m.user_id THEN 'admin' ELSE 'member' END as role
       FROM memberships m
       JOIN users u ON m.user_id = u.id
       JOIN groups g ON g.id = m.group_id
       WHERE m.group_id = $1 AND m.status = 'ACTIVE'
       ORDER BY m.joined_at ASC`,
      [groupId]
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
 * Remove a member from a group (Soft delete by setting left_at)
 * @route DELETE /api/v1/groups/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
  try {
    const groupId = req.params.id;
    const targetUserId = req.params.userId;

    // Find active membership
    const membershipResult = await db.query(
      `SELECT * FROM memberships WHERE group_id = $1 AND user_id = $2 AND status = 'ACTIVE'`,
      [groupId, targetUserId]
    );

    if (membershipResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Active membership not found' });
    }

    // Update left_at and status
    const updated = await db.query(
      `UPDATE memberships 
       SET left_at = CURRENT_TIMESTAMP, status = 'LEFT', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [membershipResult.rows[0].id]
    );

    res.status(200).json({
      success: true,
      message: 'Member removed successfully',
      data: updated.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addMember,
  getMembers,
  removeMember,
};


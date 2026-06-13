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
      return res.status(400).json({ error: 'User email is required to add member' });
    }

    // 1. Find user by email
    const userResult = await db.query('SELECT id FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. They must register first.' });
    }
    const newMemberId = userResult.rows[0].id;

    // 2. Check if already a member
    const membershipCheck = await db.query(
      'SELECT * FROM memberships WHERE group_id = $1 AND user_id = $2',
      [groupId, newMemberId]
    );

    if (membershipCheck.rows.length > 0) {
      const existing = membershipCheck.rows[0];
      if (existing.status === 'ACTIVE') {
        return res.status(400).json({ error: 'User is already an active member of this group' });
      } else {
        // If they left previously, they might need a new row or update the existing row.
        // Our schema says unique_group_user UNIQUE (group_id, user_id, left_at), meaning they can rejoin 
        // and create a new row if left_at is different, but for simplicity let's insert a new row 
        // since left_at is part of the UNIQUE constraint.
      }
    }

    // 3. Insert membership
    const newMembership = await db.query(
      'INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, $3) RETURNING *',
      [groupId, newMemberId, 'ACTIVE']
    );

    res.status(201).json({
      message: 'Member added successfully',
      membership: newMembership.rows[0]
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
      return res.status(404).json({ error: 'Active membership not found' });
    }

    // Update left_at and status
    const updated = await db.query(
      `UPDATE memberships 
       SET left_at = CURRENT_TIMESTAMP, status = 'LEFT', updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 RETURNING *`,
      [membershipResult.rows[0].id]
    );

    res.status(200).json({
      message: 'Member removed successfully',
      membership: updated.rows[0]
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  addMember,
  removeMember
};

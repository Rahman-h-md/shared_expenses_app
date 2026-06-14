require('dotenv').config({ path: './backend/.env' });
const db = require('../config/db');
const bcrypt = require('bcryptjs');

async function seedCsvUsers() {
  console.log('Seeding extended test users for CSV...');
  try {
    const testUsers = [
      { firstName: 'Aisha', lastName: 'Rahman', email: 'aisha@example.com' },
      { firstName: 'Rohan', lastName: 'Sharma', email: 'rohan@example.com' },
      { firstName: 'Priya', lastName: 'Singh', email: 'priya@example.com' },
      { firstName: 'Sam', lastName: 'Fernandez', email: 'sam@example.com' },
      { firstName: 'Dev', lastName: 'Patel', email: 'dev@example.com' },
      { firstName: 'Meera', lastName: 'Nair', email: 'meera@example.com' },
      { firstName: 'Priya S', lastName: 'Sen', email: 'priyas@example.com' },
      { firstName: "Dev's friend Kabir", lastName: 'Kabir', email: 'kabir@example.com' }
    ];

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password123!', salt);
    const userIds = [];

    for (let u of testUsers) {
      // Check if user exists
      const existRes = await db.query('SELECT id FROM users WHERE email = $1', [u.email]);
      let userId;
      if (existRes.rows.length > 0) {
        userId = existRes.rows[0].id;
        console.log(`User ${u.firstName} already exists with ID: ${userId}`);
      } else {
        const insertRes = await db.query(
          'INSERT INTO users (first_name, last_name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id',
          [u.firstName, u.lastName, u.email, hashedPassword]
        );
        userId = insertRes.rows[0].id;
        console.log(`Created user ${u.firstName} with ID: ${userId}`);
      }
      userIds.push(userId);
    }

    // Add them to all existing groups
    const groupsRes = await db.query('SELECT id, name FROM groups');
    console.log(`Found ${groupsRes.rows.length} groups to process.`);

    for (let group of groupsRes.rows) {
      for (let userId of userIds) {
        const memberRes = await db.query(
          "SELECT id FROM memberships WHERE group_id = $1 AND user_id = $2 AND status = 'ACTIVE'",
          [group.id, userId]
        );
        if (memberRes.rows.length === 0) {
          await db.query(
            "INSERT INTO memberships (group_id, user_id, joined_at, status) VALUES ($1, $2, CURRENT_TIMESTAMP, 'ACTIVE')",
            [group.id, userId]
          );
          console.log(`Added user ID ${userId} to Group ${group.name} (${group.id})`);
        }
      }
    }

    console.log('All extended CSV test users seeded successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding test users:', err);
    process.exit(1);
  }
}

seedCsvUsers();

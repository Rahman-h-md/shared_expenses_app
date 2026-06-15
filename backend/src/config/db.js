const { Pool } = require('pg');
require('dotenv').config();

const isProduction = process.env.NODE_ENV === 'production';
const requiresSSL = isProduction || (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('render.com'));

// Initialize PostgreSQL Connection Pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
});

pool.on('connect', () => {
  console.log('PostgreSQL Connection Pool established successfully');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Helper query function to automatically handle connections from the pool
const query = (text, params) => pool.query(text, params);

module.exports = {
  pool,
  query,
};

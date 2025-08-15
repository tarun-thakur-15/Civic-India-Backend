require('dotenv').config();
const { Pool } = require('pg');

// Use DATABASE_URL if provided (e.g., in production with Supabase)
const pool = new Pool(
  process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // needed for Supabase
      }
    : {
        user: 'postgres',
        host: 'localhost',
        database: 'civicindia',
        password: 'admin',
        port: 5432,
      }
);

module.exports = pool;

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const sql = fs.readFileSync(
  path.join(__dirname, '../../database/alter_20260608_add_lifestyle_roommate.sql'),
  'utf8'
);

pool.query(sql)
  .then(() => {
    console.log('Migration OK: user_lifestyle_profiles and user_roommate_preferences created.');
    pool.end();
  })
  .catch(e => {
    console.error('Migration error:', e.message);
    pool.end();
    process.exit(1);
  });

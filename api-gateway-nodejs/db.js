const { Pool } = require('pg');
const pool = new Pool({
  host: 'postgres-mock-db',
  database: 'emartdb',
  user: 'emartuser',
  password: 'emartpass',
  port: 5432,
});
module.exports = pool;

const mysql = require('mysql2/promise');
require('dotenv').config();

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '9726148425', // Your DB Password
  database: 'bahuchar_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Connection
db.getConnection()
  .then(() => console.log("✅ Database Connected"))
  .catch(err => console.error("❌ DB Connection Failed:", err));

module.exports = db;
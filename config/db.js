const mysql = require('mysql2/promise');
require('dotenv').config();

// Using Railway's default environment variable names
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD, // Fixed the typo here!
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test Connection
db.getConnection()
  .then((connection) => {
      console.log("✅ Database Connected to Railway Successfully!");
      connection.release(); // Always release the connection back to the pool
  })
  .catch(err => console.error("❌ DB Connection Failed:", err));

module.exports = db;
// const mysql = require('mysql2');
// require('dotenv').config();

// const pool = mysql.createPool({
//   host: process.env.MYSQLHOST,
//   user: process.env.MYSQLUSER,
//   password: process.env.MYSQLPASSWORD,
//   database: process.env.MYSQLDATABASE,
//   port: process.env.MYSQLPORT || 3306,
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0,
  
//   // 🚨 THIS IS THE MAGIC FIX 🚨
//   // Railway requires SSL for outside connections. 
//   // This turns it on for Railway, but keeps it off if you switch back to localhost.
//   ssl: process.env.MYSQLHOST === 'localhost' ? null : {
//     rejectUnauthorized: false
//   }
// });

// module.exports = pool.promise();


const mysql = require('mysql2');
require('dotenv').config();

// This works on your laptop AND automatically works on the live Railway server!
const pool = mysql.createPool(process.env.DATABASE_URL || process.env.MYSQL_URL);

module.exports = pool.promise();
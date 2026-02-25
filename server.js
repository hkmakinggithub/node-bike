const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// 1. ADVANCED CORS SETTINGS
// This fixes the "Blocked by CORS" error for Netlify
app.use(cors({
  origin: [
    'https://bhucharinfocare.netlify.app',
    /\.netlify\.app$/ // Allows all Netlify preview subdomains
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(cors(corsOptions));

// 2. DATABASE CONNECTION
const db = mysql.createPool({
  host: process.env.MYSQLHOST,
  user: process.env.MYSQLUSER,
  password: process.env.MYSQLPASSWORD,
  database: process.env.MYSQLDATABASE,
  port: process.env.MYSQLPORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err.message);
  } else {
    console.log("✅ Database Connected to Railway Successfully!");
    connection.release();
  }
});

// 3. THE LOGIN ROUTE WITH DEBUG LOGS
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  
  console.log("🔍 Login Attempt for Email:", email);

  const sql = "SELECT * FROM users WHERE email = ?";
  
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("❌ SQL Error:", err);
      return res.status(500).json({ message: "Database error" });
    }

    if (results.length === 0) {
      console.log("❌ Error: User not found in database for:", email);
      return res.status(401).json({ message: "Invalid email or user not found" });
    }

    const user = results[0];
    console.log("✅ User found in DB:", user.username);

    // Compare Password
    try {
      const isMatch = await bcrypt.compare(password, user.password);
      console.log("🔐 Password Match Result:", isMatch);

      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }

      // Login Success
      console.log("🚀 Login Successful for:", user.username);
      res.status(200).json({
        message: "Login successful",
        user: { id: user.id, username: user.username, role: user.role }
      });

    } catch (bcryptErr) {
      console.error("❌ Bcrypt Error:", bcryptErr);
      return res.status(500).json({ message: "Internal server error during password check" });
    }
  });
});

// 4. TEST ROUTE
app.get('/', (req, res) => {
  res.send('Bike App Server is Running!');
});

// 5. START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server Running on Port ${PORT}`);
});

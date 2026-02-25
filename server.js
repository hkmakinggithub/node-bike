const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// 1. ADVANCED CORS SETTINGS (The Bouncer)
const corsOptions = {
  origin: [
    'https://bhucharinfocare.netlify.app',
    /\.netlify\.app$/, 
    'http://localhost:5173' // 🚨 ADDED: Allows your local React app to connect!
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// 2. DATABASE CONNECTION CHECK
// We use the pool you already set up in config/db.js!
const db = require('./config/db');

db.execute('SELECT 1')
  .then(() => console.log("✅ Database Connected Successfully!"))
  .catch((err) => console.error("❌ Database Connection Failed:", err.message));

// 3. CONNECT ALL YOUR ROUTES
// This brings in ALL your sales, master, service, and login routes!
const apiRoutes = require('./routes/apiRoutes');
app.use('/api', apiRoutes); 

// 4. TEST ROUTE
app.get('/', (req, res) => {
  res.send('Bike App Server is Running! API is connected.');
});

// 5. START SERVER
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`🚀 Server Running on Port ${PORT}`);
});
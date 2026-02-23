const jwt = require('jsonwebtoken');
require('dotenv').config();

// 1. Verify if the user is logged in
const verifyToken = (req, res, next) => {
  console.log("🛡️ [GUARD 1] Checking ID Badge (Token)...");
  
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token || token === 'null') {
    console.log("❌ [GUARD 1 FAILED] No token was sent from React!");
    return res.status(403).json({ message: "No Token Provided" });
  }

  try {
    // 🚨 IMPORTANT: Make sure the fallback secret matches the one in authController!
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bahuchar_secret_2026');
    req.user = decoded; 
    console.log("✅ [GUARD 1 PASSED] Badge belongs to role:", req.user.role);
    next();
  } catch (err) {
    console.log("❌ [GUARD 1 FAILED] Token is expired or invalid.");
    return res.status(401).json({ message: "Invalid Session" });
  }
};

// 2. Verify if the user is an ADMIN
const isAdmin = (req, res, next) => {
  console.log("🛡️ [GUARD 2] Checking if Boss (ADMIN)...");
  
  if (req.user && req.user.role === 'ADMIN') {
    console.log("✅ [GUARD 2 PASSED] Welcome, Boss.");
    next();
  } else {
    console.log("❌ [GUARD 2 FAILED] Access Denied. User role is:", req.user?.role);
    return res.status(403).json({ message: "Access Denied: Admin Rights Required" });
  }
};

module.exports = { verifyToken, isAdmin };
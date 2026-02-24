const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
require('dotenv').config();

// ✅ FIXED: Removed the extra ".js" from the folder name
const { sendEmail } = require('../utils.js/mailer'); 

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (rows.length === 0) return res.status(401).json({ message: 'User not found' });

    const user = rows[0];
    let isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch) isMatch = (password === user.password); 

    if (!isMatch) return res.status(401).json({ message: 'Invalid Password' });

    if (user.role === 'STAFF') {
      const loginTime = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
      sendEmail(
        'harshsompura24@gmail.com', 
        'SECURITY ALERT: Staff Login', 
        `Staff (${user.email}) logged in at ${loginTime}.`
      );
    }

    // 🚨 THE FIX: Safely parse the permissions from the database
    let parsedPermissions = [];
    if (user.permissions) {
      try {
        // MySQL returns this as a string, we need to convert it to a real Array for React
        parsedPermissions = typeof user.permissions === 'string' 
          ? JSON.parse(user.permissions) 
          : user.permissions;
      } catch (e) {
        parsedPermissions = [];
      }
    }
// Inside your login route:
const { email, password } = req.body;
console.log("🔍 Login Attempt for:", email); 

db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (results.length === 0) {
        console.log("❌ Error: User not found in database");
        return res.status(401).send("Invalid email");
    }

    const user = results[0];
    console.log("✅ User found:", user.username);

    const isMatch = await bcrypt.compare(password, user.password);
    console.log("🔐 Password Match:", isMatch);

    if (!isMatch) return res.status(401).send("Invalid password");
});
    const token = jwt.sign(
      { id: user.id, role: user.role, branchId: user.branch_id }, 
      process.env.JWT_SECRET || 'bahuchar_secret_2026', 
      { expiresIn: '12h' }
    );

    // 🚨 THE FIX: Add permissions to the response sent to React!
    res.json({ 
      token, 
      user: { 
        email: user.email, 
        role: user.role, 
        branchId: user.branch_id,
        permissions: parsedPermissions // <-- React needs this!
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};  
// ==========================================
// FORGOT PASSWORD (GENERATE OTP)
// ==========================================
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  try {
    const [users] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) return res.status(404).json({ message: "Email not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // ✅ FIXED: Using UTC_TIMESTAMP to avoid India/London timezone confusion
    await db.execute(
      'UPDATE users SET reset_otp = ?, otp_expiry = DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE) WHERE email = ?', 
      [otp, email]
    );

    await sendEmail(email, 'Your Password Reset OTP', `Your OTP for Bahuchar Infocare is: ${otp}. Valid for 15 mins.`);

    res.json({ message: "OTP sent to your email!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// RESET PASSWORD (VERIFY OTP)
// ==========================================
exports.resetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  try {
    // ✅ FIXED: Check the OTP and Expiry in one single SQL command
    const [users] = await db.execute(
      'SELECT * FROM users WHERE email = ? AND reset_otp = ? AND otp_expiry > UTC_TIMESTAMP()', 
      [email, otp]
    );
    
    if (users.length === 0) return res.status(400).json({ message: "Invalid or Expired OTP" });

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.execute(
      'UPDATE users SET password = ?, reset_otp = NULL, otp_expiry = NULL WHERE email = ?', 
      [hashedPassword, email]
    );

    res.json({ message: "Password reset successful!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// CREATE STAFF
// ==========================================
exports.createStaff = async (req, res) => {
  // 🚨 NEW: Added branchId to the incoming data request
  const { email, password, permissions, branchId } = req.body;
  
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const permissionsJson = JSON.stringify(permissions || []);
    
    // Default to branch '1' if somehow none is provided
    const assignedBranch = branchId || '1'; 

    // 🚨 NEW: Replaced the hardcoded '1' with ? to insert the chosen branch
    await db.execute(
      `INSERT INTO users (email, password, role, permissions, branch_id) VALUES (?, ?, 'STAFF', ?, ?)`,
      [email, hashedPassword, permissionsJson, assignedBranch]
    );
    
    res.status(201).json({ message: "Staff account created successfully!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to create staff account" });
  }
};

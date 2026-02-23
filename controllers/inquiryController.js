const db = require('../config/db');

// ==========================================
// SAVE NEW WALK-IN INQUIRY
// ==========================================
exports.createInquiry = async (req, res) => {
  const { 
    customer_name, 
    mobile_number, 
    interested_model, 
    follow_up_date, 
    notes, 
    branch_id 
  } = req.body;

  try {
    // Basic validation to ensure required fields aren't empty
    if (!customer_name || !mobile_number || !interested_model || !follow_up_date || !branch_id) {
      return res.status(400).json({ message: "Please fill in all required fields." });
    }

    const query = `
      INSERT INTO walk_in_inquiries 
      (customer_name, mobile_number, interested_model, follow_up_date, notes, branch_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    await db.execute(query, [
      customer_name, 
      mobile_number, 
      interested_model, 
      follow_up_date, 
      notes || '', // Notes are optional, so we default to an empty string if null
      branch_id
    ]);

    res.status(201).json({ message: "Lead saved successfully!" });
  } catch (err) {
    console.error("❌ Error saving inquiry:", err);
    res.status(500).json({ message: "Failed to save customer lead." });
  }
};
// ==========================================
// GET ALL INQUIRIES FOR A SPECIFIC BRANCH
// ==========================================
exports.getInquiries = async (req, res) => {
  try {
    // We grab the branch ID that React sends in the headers
    const branchId = req.headers['branch-id'] || '1';

    const query = `
      SELECT * FROM walk_in_inquiries 
      WHERE branch_id = ? 
      ORDER BY follow_up_date ASC, created_at DESC
    `;
    
    const [rows] = await db.execute(query, [branchId]);
    res.status(200).json(rows);
  } catch (err) {
    console.error("❌ Error fetching inquiries:", err);
    res.status(500).json({ message: "Failed to fetch leads." });
  }
};
// ==========================================
// UPDATE INQUIRY STATUS
// ==========================================
exports.updateInquiryStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    const query = 'UPDATE walk_in_inquiries SET status = ? WHERE id = ?';
    await db.execute(query, [status, id]);
    
    res.json({ message: `Lead updated to ${status}!` });
  } catch (err) {
    console.error("❌ Error updating status:", err);
    res.status(500).json({ message: "Failed to update status." });
  }
};
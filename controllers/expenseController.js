const db = require('../config/db');

// 1. ADD NEW EXPENSE
exports.addExpense = async (req, res) => {
  const branchId = req.headers['branch-id'];
  const { date, category, amount, description } = req.body;

  try {
    const sql = `INSERT INTO expenses (branch_id, expense_date, category, amount, description) VALUES (?, ?, ?, ?, ?)`;
    await db.execute(sql, [branchId, date, category, amount, description]);
    res.json({ message: "Expense Added Successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 2. GET RECENT EXPENSES
exports.getExpenses = async (req, res) => {
  const branchId = req.headers['branch-id'];
  try {
    const sql = `SELECT * FROM expenses WHERE branch_id = ? ORDER BY expense_date DESC, id DESC LIMIT 50`;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
const db = require('../config/db');

// ==========================================
// 1. READ OPERATIONS
// ==========================================

exports.getModels = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM models');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getSuppliers = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    const [rows] = await db.execute(
      'SELECT * FROM suppliers WHERE branch_id = ? ORDER BY id DESC',
      [branchId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getParts = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    const [rows] = await db.execute(
      'SELECT * FROM parts_master WHERE branch_id = ? ORDER BY id DESC',
      [branchId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getCustomers = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    const sql = `
      SELECT id, customer_name as name, mobile, city
      FROM customers_master
      WHERE branch_id = ?
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    console.error("SQL ERROR:", err.message);
    res.status(500).json({ message: "Database Error", error: err.message });
  }
};

exports.getServiceMenu = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    const [rows] = await db.execute(
      'SELECT * FROM service_menu WHERE branch_id = ?',
      [branchId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==========================================
// 2. WRITE OPERATIONS
// ==========================================

exports.addModel = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    await db.execute(
      'INSERT INTO models (model_name, branch_id) VALUES (?, ?)',
      [req.body.modelName.toUpperCase(), branchId]
    );
    res.json({ message: "MODEL ADDED" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

exports.addSupplier = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    await db.execute(
      'INSERT INTO suppliers (supplier_name, branch_id) VALUES (?, ?)',
      [req.body.name.toUpperCase(), branchId]
    );
    res.json({ message: "SUPPLIER ADDED" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

exports.addPart = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    await db.execute(
      'INSERT INTO parts_master (part_name, branch_id) VALUES (?, ?)',
      [req.body.name.toUpperCase(), branchId]
    );
    res.json({ message: "PART ADDED" });
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  }
};

exports.addCustomer = async (req, res) => {
  try {
    const branchId = req.headers['branch-id'] || 1;
    const { name, mobile, city } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Customer Name is required" });
    }

    const sql = `
      INSERT INTO customers_master 
      (customer_name, mobile, city, branch_id) 
      VALUES (?, ?, ?, ?)
    `;

    await db.execute(sql, [
      name.toUpperCase(),
      mobile || '',
      city ? city.toUpperCase() : '',
      branchId
    ]);

    res.status(201).json({
      success: true,
      message: "Customer added successfully"
    });

  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: "Mobile number already exists." });
    }

    console.error("Add Customer Error:", err.message);
    res.status(500).json({ message: "Database Error", error: err.message });
  }
};

exports.addServiceItem = async (req, res) => {
  try {
    const { name, price } = req.body;
    const branchId = req.headers['branch-id'] || 1;

    await db.execute(
      'INSERT INTO service_menu (service_name, price, branch_id) VALUES (?, ?, ?)',
      [name, price, branchId]
    );

    res.json({ message: "Service Added" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
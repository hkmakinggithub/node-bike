const db = require('../config/db'); // Your database connection

// 1. SALES HISTORY (All Confirmed Sales)
exports.getSalesHistory = async (req, res) => {
  const branchId = req.headers['branch-id'];
  const sql = branchId === 'ALL' 
    ? `SELECT * FROM sales ORDER BY id DESC`
    : `SELECT * FROM sales WHERE branch_id = ? ORDER BY id DESC`;
  try {
    const [rows] = await db.execute(sql, branchId === 'ALL' ? [] : [branchId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 2. PENDING JOB CARDS (Open Jobs - Not yet Billed)
exports.getPendingJobs = async (req, res) => {
  const branchId = req.headers['branch-id'];
  // LOGIC: Select jobs from IN that do NOT exist in OUT table yet
  const sql = branchId === 'ALL'
    ? `SELECT * FROM service_job_in WHERE job_no NOT IN (SELECT job_no FROM service_job_out) ORDER BY id DESC`
    : `SELECT * FROM service_job_in WHERE branch_id = ? AND job_no NOT IN (SELECT job_no FROM service_job_out) ORDER BY id DESC`;
  try {
    const [rows] = await db.execute(sql, branchId === 'ALL' ? [] : [branchId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 3. COMPLETED JOB BILLS (Closed Jobs)
exports.getCompletedJobs = async (req, res) => {
  const branchId = req.headers['branch-id'];
  const sql = branchId === 'ALL'
    ? `SELECT * FROM service_job_out ORDER BY id DESC`
    : `SELECT * FROM service_job_out WHERE branch_id = ? ORDER BY id DESC`;
  try {
    const [rows] = await db.execute(sql, branchId === 'ALL' ? [] : [branchId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 4. PENDING SUPPLIER RETURNS (Sent to company, waiting for reply)
exports.getPendingSupplier = async (req, res) => {
  const branchId = req.headers['branch-id'];
  // LOGIC: Outward items NOT present in Inward table
  const sql = branchId === 'ALL'
    ? `SELECT * FROM supplier_outward WHERE outward_no NOT IN (SELECT outward_no FROM supplier_inward) ORDER BY id DESC`
    : `SELECT * FROM supplier_outward WHERE branch_id = ? AND outward_no NOT IN (SELECT outward_no FROM supplier_inward) ORDER BY id DESC`;
  try {
    const [rows] = await db.execute(sql, branchId === 'ALL' ? [] : [branchId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 5. COMPLETED SUPPLIER RETURNS (Received back from company)
exports.getCompletedSupplier = async (req, res) => {
  const branchId = req.headers['branch-id'];
  const sql = branchId === 'ALL'
    ? `SELECT * FROM supplier_inward ORDER BY id DESC`
    : `SELECT * FROM supplier_inward WHERE branch_id = ? ORDER BY id DESC`;
  try {
    const [rows] = await db.execute(sql, branchId === 'ALL' ? [] : [branchId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// 6. DASHBOARD ANALYTICS
exports.getDashboardStats = async (req, res) => {
  const branchId = req.headers['branch-id'];
  const timeRange = req.query.range || 'ALL';

  try {
    const buildQuery = (baseTable, dateCol) => {
      let sql = ` FROM ${baseTable} WHERE 1=1`;
      const params = [];
      if (branchId && branchId !== 'ALL') {
        sql += ` AND branch_id = ?`;
        params.push(branchId);
      }
      if (timeRange === 'MONTH') {
        sql += ` AND MONTH(${dateCol}) = MONTH(CURRENT_DATE()) AND YEAR(${dateCol}) = YEAR(CURRENT_DATE())`;
      } else if (timeRange === 'YEAR') {
        sql += ` AND YEAR(${dateCol}) = YEAR(CURRENT_DATE())`;
      }
      return { sql, params };
    };

    // Initialize default values
    let totalSales = 0, totalService = 0, totalExpenses = 0, pendingCount = 0;
    let models = [];

    // A. SALES
    try {
      // ⚠️ CHANGE 'date' TO MATCH YOUR SALES TABLE DATE COLUMN ⚠️
     const qSales = buildQuery('sales', 'date'); 

      const [sales] = await db.execute(`SELECT SUM(price) as total ${qSales.sql}`, qSales.params);
      totalSales = Number(sales[0]?.total) || 0;
    } catch (e) { console.error("Sales Query Failed:", e.message); }

    // B. SERVICE
    try {
      // ⚠️ CHANGE 'date' TO MATCH YOUR SERVICE TABLE DATE COLUMN ⚠️
      const qService = buildQuery('service_job_out', 'date');
      const [service] = await db.execute(`SELECT SUM(grand_total) as total ${qService.sql}`, qService.params);
      totalService = Number(service[0]?.total) || 0;
    } catch (e) { console.error("Service Query Failed:", e.message); }

    // C. EXPENSES
    try {
      const qExpense = buildQuery('expenses', 'expense_date');
      const [expenses] = await db.execute(`SELECT SUM(amount) as total ${qExpense.sql}`, qExpense.params);
      totalExpenses = Number(expenses[0]?.total) || 0;
    } catch (e) { console.error("Expense Query Failed:", e.message); }

    // D. MODELS
    try {
      const qModels = buildQuery('sales', 'date');
      const [modelData] = await db.execute(`SELECT model_name as name, COUNT(*) as value ${qModels.sql} GROUP BY model_name`, qModels.params);
      models = modelData;
    } catch (e) { console.error("Model Query Failed:", e.message); }

    // E. PENDING JOBS
    try {
      let pendingSql = `SELECT COUNT(*) as count FROM service_job_in WHERE 1=1`;
      const pendingParams = [];
      if (branchId && branchId !== 'ALL') {
        pendingSql += ` AND branch_id = ?`;
        pendingParams.push(branchId);
      }
      pendingSql += ` AND job_no NOT IN (SELECT job_no FROM service_job_out)`;
      const [pending] = await db.execute(pendingSql, pendingParams);
      pendingCount = pending[0]?.count || 0;
    } catch (e) { console.error("Pending Jobs Query Failed:", e.message); }

    // --- CALCULATE AND SEND ---
    const totalRevenue = totalSales + totalService;
    const netProfit = totalRevenue - totalExpenses;

    res.json({
      income: [
        { name: 'Vehicle Sales', amount: totalSales },
        { name: 'Service', amount: totalService }
      ],
      models: models,
      pendingJobs: pendingCount,
      totalRevenue: totalRevenue,
      totalExpenses: totalExpenses,
      netProfit: netProfit
    });

  } catch (err) {
    console.error("Critical Dashboard Error:", err);
    res.status(500).json({ error: err.message });
  }
};
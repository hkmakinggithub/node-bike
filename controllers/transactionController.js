const db = require('../config/db');

// Helper to get branch ID
const getBranch = (req) => req.headers['branch-id'] || 1;

/* =====================================================
   1. VEHICLE SALES
===================================================== */

exports.saveSale = async (req, res) => {
  try {
    const d = req.body;
    const branchId = getBranch(req);
    const validFinanceDate =
      d.paymentMethod === 'FINANCE' && d.financeDate ? d.financeDate : null;

    const sql = `
      INSERT INTO sales (
        customer_name, mobile, city, model_name,
        chassis_no, motor_no, controller_no, charger_no,
        battery_type, battery_serial_no,
        price, payment_method,
        finance_company, finance_id, finance_date,
        downpayment, installment_count, installment_amount,
        branch_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    await db.execute(sql, [
      d.customerName, d.mobile, d.city, d.modelName,
      d.chassisNo, d.motorNo, d.controllerNo, d.chargerNo,
      d.batteryType, d.batterySerialNo,
      d.price || 0, d.paymentMethod,
      d.financeCompany, d.financeId, validFinanceDate,
      d.downpayment || 0, d.installmentCount || 0, d.installmentAmount || 0,
      branchId
    ]);

    res.json({ message: "SALE SAVED SUCCESSFULLY" });
  } catch (err) {
    res.status(500).json({ message: "DB Error", error: err.message });
  }
};

/* =====================================================
   2. SUPPLIER (STOCK IN/OUT)
===================================================== */

exports.getOutwardNo = async (req, res) => {
  const branchId = getBranch(req);
  const [rows] = await db.execute(
    'SELECT COUNT(*) as count FROM supplier_outward WHERE branch_id = ?',
    [branchId]
  );
  res.json({
    outwardNo: `OUT-${branchId}-${String(rows[0].count + 1).padStart(4, '0')}`
  });
};

exports.saveOutward = async (req, res) => {
  try {
    const d = req.body;
    const branchId = getBranch(req);

    const validDate =
      d.warranty === 'YES' && d.purchaseDate ? d.purchaseDate : null;
    const validInvoice =
      d.warranty === 'YES' && d.purchaseInvoice ? d.purchaseInvoice : null;

    await db.execute(
      `INSERT INTO supplier_outward
      (outward_no, outward_date, supplier_name, warranty,
       purchase_date, purchase_invoice, part_name, part_serial, fault, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.outwardNo, d.date, d.supplierName, d.warranty,
        validDate, validInvoice, d.partName, d.partSerial,
        d.fault, branchId
      ]
    );

    res.json({ message: "OUTWARD SAVED" });
  } catch (err) {
    res.status(500).json({ message: "DB Error", error: err.message });
  }
};

exports.getPendingOutwards = async (req, res) => {
  const branchId = getBranch(req);
  const [rows] = await db.execute(
    `SELECT * FROM supplier_outward
     WHERE branch_id = ?
     AND outward_no NOT IN
     (SELECT outward_no FROM supplier_inward WHERE branch_id = ?)
     ORDER BY id DESC`,
    [branchId, branchId]
  );
  res.json(rows);
};

exports.saveInward = async (req, res) => {
  try {
    const d = req.body;
    const branchId = getBranch(req);

    await db.execute(
      `INSERT INTO supplier_inward
      (inward_date, outward_no, supplier_name,
       part_name, result_type, final_serial_no, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        d.date, d.outwardNo, d.supplierName,
        d.partName, d.resultType, d.finalSerialNo,
        branchId
      ]
    );

    if (d.resultType === 'REPLACE') {
      await db.execute(
        'UPDATE parts_master SET stock = stock + 1 WHERE part_name = ? AND branch_id = ?',
        [d.partName, branchId]
      );
    }

    res.json({ message: "CASE CLOSED & STOCK UPDATED" });
  } catch (err) {
    res.status(500).json({ message: "DB Error", error: err.message });
  }
};

/* =====================================================
   3. CUSTOMER JOB CARD
===================================================== */

// ✅ Smart JC Number
exports.getCustInwardNo = async (req, res) => {
  const branchId = getBranch(req);

  try {
    const [rows] = await db.execute(
      "SELECT inward_no FROM customer_inward WHERE branch_id = ? ORDER BY id DESC LIMIT 1",
      [branchId]
    );

    let newNum = 1001;

    if (rows.length > 0 && rows[0].inward_no) {
      const lastNum =
        parseInt(rows[0].inward_no.replace(/[^0-9]/g, '')) || 1000;
      newNum = lastNum + 1;
    }

    res.json({ inwardNo: `JC-${newNum}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.saveCustInward = async (req, res) => {
  try {
    const d = req.body;
    const branchId = getBranch(req);

    const validDate =
      d.warranty === 'YES' && d.purchaseDate ? d.purchaseDate : null;
    const validInvoice =
      d.warranty === 'YES' && d.purchaseInvoice ? d.purchaseInvoice : null;

    await db.execute(
      `INSERT INTO customer_inward
      (inward_no, inward_date, customer_name,
       warranty, purchase_date, purchase_invoice,
       part_name, part_serial, part_fault,
       status, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
      [
        d.inwardNo, d.date, d.customerName,
        d.warranty || 'NO',
        validDate, validInvoice,
        d.partName, d.partSerial,
        d.fault, branchId
      ]
    );

    res.json({ message: "JOB OPENED" });
  } catch (err) {
    res.status(500).json({ message: "DB Error", error: err.message });
  }
};

exports.getPendingJobCards = async (req, res) => {
  const branchId = getBranch(req);

  const [rows] = await db.execute(
    `SELECT * FROM customer_inward
     WHERE branch_id = ?
     AND inward_no NOT IN
     (SELECT inward_no FROM customer_outward WHERE branch_id = ?)
     ORDER BY id DESC`,
    [branchId, branchId]
  );

  res.json(rows);
};

exports.saveCustOutward = async (req, res) => {
  try {
    const d = req.body;
    const branchId = getBranch(req);

    if (d.resultType === 'REPLACE') {
      const [part] = await db.execute(
        'SELECT stock FROM parts_master WHERE part_name = ? AND branch_id = ?',
        [d.partName, branchId]
      );

      if (part.length > 0 && part[0].stock <= 0) {
        return res.status(400).json({ message: "OUT OF STOCK!" });
      }

      await db.execute(
        'UPDATE parts_master SET stock = stock - 1 WHERE part_name = ? AND branch_id = ?',
        [d.partName, branchId]
      );
    }

    await db.execute(
      `INSERT INTO customer_outward
      (outward_date, inward_no, customer_name,
       part_name, result_type, final_serial_no,
       charges, branch_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        d.date, d.inwardNo, d.customerName,
        d.partName, d.resultType,
        d.finalSerialNo, d.charges,
        branchId
      ]
    );

    res.json({ message: "JOB CLOSED & STOCK DEDUCTED" });
  } catch (err) {
    res.status(500).json({ message: "DB Error", error: err.message });
  }
};
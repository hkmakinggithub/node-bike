const db = require('../config/db');

// ==========================================
// 1. CUSTOMER INWARD (GENERATING JOB NUMBER)
// ==========================================
exports.getCustInwardNo = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    // 🚨 We check the job_no column in service_job_in
    const sql = `SELECT job_no FROM service_job_in WHERE branch_id = ? ORDER BY id DESC LIMIT 1`;
    const [rows] = await db.execute(sql, [branchId]);

    let newNum = 1001;
    if (rows.length > 0 && rows[0].job_no) {
      // Extract numbers from strings like 'JC-1000'
      const lastNumStr = rows[0].job_no.replace(/[^0-9]/g, '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) newNum = lastNum + 1;
    }

    res.json({ inwardNo: `JC-${newNum}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getInwardNo = async (req, res) => {
    try {
        // 1. Get the count or max ID from your inward table
        const [rows] = await db.execute("SELECT MAX(id) as lastId FROM supplier_inwards");
        const nextId = (rows[0].lastId || 0) + 1;

        // 2. Format it nicely (e.g., INW-1001, INW-1002)
        const formattedNo = `INW-${1000 + nextId}`;

        res.json({ inwardNo: formattedNo });
    } catch (err) {
        console.error("🚨 Error generating Inward No:", err.message);
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};
// ==========================================
// 2. CUSTOMER INWARD / MASTER ENTRY SAVE
// ==========================================
exports.saveServiceJobMaster = async (req, res) => {
  const d = req.body;
  const branchId = req.headers['branch-id'] || 1;

  try {
    const sql = `
      INSERT INTO service_job_in 
      (job_no, job_date, customer_name, mobile, model_name, part_serial, is_warranty, purchase_date, invoice_no, service_type, selected_services, total_amount, branch_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      d.jobNo,
      d.jobDate,
      (d.customerName || '').toUpperCase(),
      d.mobile || '',
      (d.modelName || '').toUpperCase(),
      (d.partSerial || '').toUpperCase(), // 👈 Make sure this is sent from React
      d.isWarranty || 'NO',
      d.purchaseDate || null,
      d.invoiceNo || null,
      d.serviceType || 'PAID',
      (d.selectedServices || '').toUpperCase(),
      d.totalAmount || 0,
      branchId
    ];

    await db.execute(sql, values);
    res.status(200).json({ message: "✅ Success!" });
  } catch (err) {
    console.error("❌ SQL ERROR:", err.message);
    res.status(500).json({ error: err.message });
  }
};
// ==========================================
// 3. CUSTOMER OUTWARD: GET PENDING JOBS
// ==========================================
exports.getPendingJobCards = async (req, res) => {
  const branchId = req.headers['branch-id'] || 1;
  try {
    const [rows] = await db.execute(`
      SELECT 
        jc.job_no AS inward_no, 
        jc.customer_name, 
        jc.selected_services AS part_name, 
        'N/A' AS part_serial, 
        'NORMAL SERVICE' AS part_fault
      FROM service_job_in jc
      LEFT JOIN customer_outward co ON jc.job_no = co.inward_no
      WHERE co.inward_no IS NULL AND jc.branch_id = ?
      ORDER BY jc.id DESC
    `, [branchId]);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 4. CUSTOMER OUTWARD: SAVE CLOSING RECORD
// ==========================================
exports.saveCustomerOutward = async (req, res) => {
  const { inwardNo, date, customerName, partName, resultType, finalSerialNo, charges } = req.body;
  const branchId = req.headers['branch-id'] || 1;

  try {
    await db.execute(`
      INSERT INTO customer_outward
      (inward_no, outward_date, customer_name, part_name, result_type, final_serial_no, charges, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      inwardNo, date, customerName || '', partName || '', 
      resultType || 'REPAIR', finalSerialNo || '', charges || 0, branchId
    ]);

    res.status(200).json({ message: "✅ Job Closed Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 5. CUSTOMER WARRANTY REPORT (CLAIMS TRACKING)
// ==========================================
exports.getWarrantyReport = async (req, res) => {
  const branchId = req.headers['branch-id'] || 1;
  try {
    const sql = `
      SELECT 
        jc.id, jc.job_no, jc.job_date, jc.customer_name, jc.mobile, 
        jc.selected_services AS part_name, 'N/A' AS part_serial, jc.purchase_date, jc.invoice_no AS purchase_invoice, 
        CASE 
          WHEN s_in.outward_no IS NOT NULL THEN 'RECEIVED'
          WHEN s_out.outward_no IS NOT NULL THEN 'COMPANY'
          ELSE 'SHOP'
        END AS warranty_status
      FROM service_job_in jc
      LEFT JOIN supplier_outward s_out ON jc.job_no = s_out.job_card_ref
      LEFT JOIN supplier_inward s_in ON s_out.outward_no = s_in.outward_no
      WHERE jc.is_warranty = 'YES' AND jc.branch_id = ? 
      ORDER BY jc.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 6. SUPPLIER OUTWARD: GET PENDING PARTS
// ==========================================
exports.getPendingWarrantyParts = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT job_no AS inward_no, customer_name, selected_services AS part_name, 'N/A' AS part_serial 
      FROM service_job_in 
      WHERE is_warranty = 'YES' 
      AND job_no NOT IN (SELECT job_card_ref FROM supplier_outward)
      AND branch_id = ?
      ORDER BY id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 7. FETCH ALL SERVICE JOBS (MASTER LIST)
// ==========================================
exports.getServiceJobs = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT 
        jc.*, 
        co.outward_date, 
        co.result_type, 
        co.final_serial_no,
        co.charges AS outward_charges,
        IF(co.inward_no IS NULL, 'PENDING', 'DONE') AS job_status
      FROM service_job_in jc
      LEFT JOIN customer_outward co ON jc.job_no = co.inward_no
      WHERE jc.branch_id = ?
      ORDER BY jc.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 8. SUPPLIER INWARD: GET PENDING PARTS AT COMPANY
// ==========================================
exports.getPendingSupplierOutwards = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT * FROM supplier_outward 
      WHERE branch_id = ? 
      AND outward_no NOT IN (SELECT outward_no FROM supplier_inward)
      ORDER BY id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 9. SUPPLIER INWARD: RECEIVE PART BACK
// ==========================================
exports.saveSupplierInward = async (req, res) => {
  const { outwardNo, date, supplierName, partName, resultType, finalSerialNo } = req.body;
  const branchId = req.headers['branch-id'] || '1';
  
  try {
    const sql = `
      INSERT INTO supplier_inward 
      (inward_date, outward_no, supplier_name, part_name, result_type, final_serial_no, branch_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [
      date, outwardNo, supplierName, partName, resultType, finalSerialNo || '', branchId
    ]);
    res.status(200).json({ message: "✅ Part Received Back from Company!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 10. WARRANTY MASTER REPORT (SUPPLIER VIEW)
// ==========================================
exports.getWarrantyMasterReport = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT 
        so.outward_no, so.outward_date, so.supplier_name, so.part_name, so.part_serial AS old_serial, 
        si.inward_date, si.result_type, si.final_serial_no AS new_serial, 
        IF(si.outward_no IS NULL, 'PENDING', 'DONE') AS status
      FROM supplier_outward so
      LEFT JOIN supplier_inward si ON so.outward_no = si.outward_no
      WHERE so.branch_id = ? ORDER BY so.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// ==========================================
// 1. CUSTOMER INWARD (GENERATING JOB NUMBER)
// ==========================================
exports.getCustInwardNo = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `SELECT job_no FROM service_job_in WHERE branch_id = ? ORDER BY id DESC LIMIT 1`;
    const [rows] = await db.execute(sql, [branchId]);

    let newNum = 1001;
    if (rows.length > 0 && rows[0].job_no) {
      const lastNumStr = rows[0].job_no.replace(/[^0-9]/g, '');
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum)) newNum = lastNum + 1;
    }

    res.json({ inwardNo: `JC-${newNum}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 1b. SUPPLIER INWARD NO (FIXED TYPO)
// ==========================================
exports.getInwardNo = async (req, res) => {
    try {
        // 🚨 FIXED: Changed supplier_inwards to supplier_inward
        const [rows] = await db.execute("SELECT MAX(id) as lastId FROM supplier_inward");
        const nextId = (rows[0].lastId || 0) + 1;
        const formattedNo = `INW-${1000 + nextId}`;
        res.json({ inwardNo: formattedNo });
    } catch (err) {
        res.status(500).json({ message: "Server Error", error: err.message });
    }
};

// ==========================================
// 2. CUSTOMER INWARD / MASTER ENTRY SAVE
// ==========================================
exports.saveServiceJobMaster = async (req, res) => {
  const d = req.body;
  const branchId = req.headers['branch-id'] || 1;

  try {
    const sql = `
      INSERT INTO service_job_in 
      (job_no, job_date, customer_name, mobile, model_name, part_serial, is_warranty, purchase_date, invoice_no, service_type, selected_services, total_amount, branch_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      d.jobNo, d.jobDate, (d.customerName || '').toUpperCase(), d.mobile || '',
      (d.modelName || '').toUpperCase(), (d.partSerial || '').toUpperCase(), 
      d.isWarranty || 'NO', d.purchaseDate || null, d.invoiceNo || null,
      d.serviceType || 'PAID', (d.selectedServices || '').toUpperCase(), d.totalAmount || 0, branchId
    ];

    await db.execute(sql, values);
    res.status(200).json({ message: "✅ Success!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 3. CUSTOMER OUTWARD: GET PENDING JOBS
// ==========================================
exports.getPendingJobCards = async (req, res) => {
  const branchId = req.headers['branch-id'] || 1;
  try {
    const [rows] = await db.execute(`
      SELECT jc.job_no AS inward_no, jc.customer_name, jc.selected_services AS part_name, 'N/A' AS part_serial, 'NORMAL SERVICE' AS part_fault
      FROM service_job_in jc
      LEFT JOIN customer_outward co ON jc.job_no = co.inward_no
      WHERE co.inward_no IS NULL AND jc.branch_id = ? ORDER BY jc.id DESC
    `, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 4. CUSTOMER OUTWARD: SAVE CLOSING RECORD
// ==========================================
exports.saveCustomerOutward = async (req, res) => {
  const { inwardNo, date, customerName, partName, resultType, finalSerialNo, charges } = req.body;
  const branchId = req.headers['branch-id'] || 1;
  try {
    await db.execute(`
      INSERT INTO customer_outward (inward_no, outward_date, customer_name, part_name, result_type, final_serial_no, charges, branch_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [inwardNo, date, customerName || '', partName || '', resultType || 'REPAIR', finalSerialNo || '', charges || 0, branchId]);
    res.status(200).json({ message: "✅ Job Closed Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 5. SUPPLIER OUTWARD: GENERATE NUMBER 🚨 (ADDED)
// ==========================================
exports.getOutwardNo = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT MAX(id) as lastId FROM supplier_outward");
        const nextId = (rows[0].lastId || 0) + 1;
        res.json({ outwardNo: `OUT-${1000 + nextId}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ==========================================
// SERVICE BILLING (JOB OUT)
// ==========================================
exports.getServiceOutNo = async (req, res) => {
    try {
        const [rows] = await db.execute("SELECT MAX(id) as lastId FROM service_bills");
        const nextId = (rows[0].lastId || 0) + 1;
        res.json({ outNo: `BILL-${1000 + nextId}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.getPendingServiceJobs = async (req, res) => {
    const branchId = req.headers['branch-id'] || '1';
    try {
        // Find jobs that have NOT been billed yet
        const sql = `
            SELECT jc.* FROM service_job_in jc
            LEFT JOIN service_bills sb ON jc.job_no = sb.job_no
            WHERE sb.job_no IS NULL AND jc.branch_id = ?
            ORDER BY jc.id DESC
        `;
        const [rows] = await db.execute(sql, [branchId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

exports.saveServiceBill = async (req, res) => {
    const d = req.body;
    try {
        const sql = `
            INSERT INTO service_bills 
            (bill_no, bill_date, job_no, customer_name, model_name, service_type, service_amount, parts_amount, grand_total, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        await db.execute(sql, [
            d.outNo, d.date, d.jobNo, d.customerName, d.modelName, 
            d.serviceType, d.serviceAmount, d.partsAmount, d.grandTotal, d.branchId || 1
        ]);
        res.status(200).json({ message: "✅ Bill Saved Successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
// ==========================================
// 6. SUPPLIER OUTWARD: SAVE ENTRY 🚨 (ADDED)
// ==========================================
// ==========================================
// SUPPLIER OUTWARD: SAVE ENTRY (WITH DEBUGGING)
// ==========================================
exports.saveOutward = async (req, res) => {
    // 1. We log EXACTLY what React is sending us
    console.log("➡️ INCOMING OUTWARD DATA:", req.body); 

    const { outwardNo, date, supplierName, partName, partSerial, fault, job_card_ref } = req.body;
    const branchId = req.headers['branch-id'] || '1';

    try {
        const sql = `
            INSERT INTO supplier_outward 
            (outward_no, outward_date, supplier_name, part_name, part_serial, fault, job_card_ref, branch_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        // 2. We use || null or || '' to prevent the "undefined" crash!
        const values = [
            outwardNo || 'UNKNOWN', 
            date || null, 
            supplierName || 'UNKNOWN', 
            partName || 'UNKNOWN', 
            partSerial || '', 
            fault || '', 
            job_card_ref || null, 
            branchId
        ];

        await db.execute(sql, values);
        console.log("✅ OUTWARD SAVED SUCCESSFULLY TO DB!");
        res.status(200).json({ message: "✅ Outward Saved Successfully" });

    } catch (err) {
        // 3. THIS WILL TELL US EXACTLY WHAT IS BROKEN
        console.error("🚨 MYSQL REJECTED THE SAVE. REASON:", err.message); 
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 7. SUPPLIER OUTWARD: GET LIST 🚨 (ADDED)
// ==========================================
exports.getSupplierOutwards = async (req, res) => {
    const branchId = req.headers['branch-id'] || '1';
    try {
        const [rows] = await db.execute(`SELECT * FROM supplier_outward WHERE branch_id = ? ORDER BY id DESC`, [branchId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 8. SUPPLIER OUTWARD: PENDING CUSTOMER PARTS 🚨 (ADDED)
// ==========================================
exports.getPendingCustomerParts = async (req, res) => {
    const branchId = req.headers['branch-id'] || '1';
    try {
        const sql = `
            SELECT job_no AS inward_no, customer_name, selected_services AS part_name, part_serial, 'N/A' AS fault
            FROM service_job_in 
            WHERE is_warranty = 'YES' 
            AND job_no NOT IN (SELECT job_card_ref FROM supplier_outward WHERE job_card_ref IS NOT NULL)
            AND branch_id = ? ORDER BY id DESC
        `;
        const [rows] = await db.execute(sql, [branchId]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// ==========================================
// 9. SUPPLIER INWARD: GET PENDING OUTWARDS
// ==========================================
exports.getPendingSupplierOutwards = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT * FROM supplier_outward 
      WHERE branch_id = ? AND outward_no NOT IN (SELECT outward_no FROM supplier_inward) ORDER BY id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 10. SUPPLIER INWARD: SAVE
// ==========================================
exports.saveSupplierInward = async (req, res) => {
  const { outwardNo, date, supplierName, partName, resultType, finalSerialNo } = req.body;
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      INSERT INTO supplier_inward (inward_date, outward_no, supplier_name, part_name, result_type, final_serial_no, branch_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    await db.execute(sql, [date, outwardNo, supplierName, partName, resultType, finalSerialNo || '', branchId]);
    res.status(200).json({ message: "✅ Part Received Back from Company!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ==========================================
// 11. REPORTS
// ==========================================
exports.getWarrantyReport = async (req, res) => {
  const branchId = req.headers['branch-id'] || 1;
  try {
    const sql = `
      SELECT jc.id, jc.job_no, jc.job_date, jc.customer_name, jc.mobile, jc.selected_services AS part_name, 'N/A' AS part_serial, jc.purchase_date, jc.invoice_no AS purchase_invoice, 
        CASE 
          WHEN s_in.outward_no IS NOT NULL THEN 'RECEIVED'
          WHEN s_out.outward_no IS NOT NULL THEN 'COMPANY'
          ELSE 'SHOP'
        END AS warranty_status
      FROM service_job_in jc
      LEFT JOIN supplier_outward s_out ON jc.job_no = s_out.job_card_ref
      LEFT JOIN supplier_inward s_in ON s_out.outward_no = s_in.outward_no
      WHERE jc.is_warranty = 'YES' AND jc.branch_id = ? ORDER BY jc.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getServiceJobs = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT jc.*, co.outward_date, co.result_type, co.final_serial_no, co.charges AS outward_charges, IF(co.inward_no IS NULL, 'PENDING', 'DONE') AS job_status
      FROM service_job_in jc
      LEFT JOIN customer_outward co ON jc.job_no = co.inward_no
      WHERE jc.branch_id = ? ORDER BY jc.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getWarrantyMasterReport = async (req, res) => {
  const branchId = req.headers['branch-id'] || '1';
  try {
    const sql = `
      SELECT so.outward_no, so.outward_date, so.supplier_name, so.part_name, so.part_serial AS old_serial, si.inward_date, si.result_type, si.final_serial_no AS new_serial, IF(si.outward_no IS NULL, 'PENDING', 'DONE') AS status
      FROM supplier_outward so
      LEFT JOIN supplier_inward si ON so.outward_no = si.outward_no
      WHERE so.branch_id = ? ORDER BY so.id DESC
    `;
    const [rows] = await db.execute(sql, [branchId]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
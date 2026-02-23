const db = require('../config/db');

// 1. SAVE A NEW SALE
exports.saveSale = async (req, res) => {
    // Destructure everything sent from the React form
    const { 
        customerName, mobile, city, modelName, chassisNo, 
        motorNo, controllerNo, chargerNo, batteryType, 
        batterySerialNo, price, paymentMethod, branch_id 
    } = req.body;

    // Use the branch ID from headers if not in body
    const finalBranchId = branch_id || req.headers['branch-id'] || 1;

    try {
        console.log("➡️ SAVING SALE FOR:", customerName);

        const sql = `
            INSERT INTO sales (
                customer_name, mobile, city, model_name, chassis_no, 
                motor_no, controller_no, charger_no, battery_type, 
                battery_serial_no, price, payment_method, branch_id, sale_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;

        const values = [
            customerName, mobile, city, modelName, chassisNo, 
            motorNo, controllerNo, chargerNo, batteryType, 
            batterySerialNo, price, paymentMethod, finalBranchId
        ];

        await db.execute(sql, values);

        console.log("✅ SALE SAVED TO DATABASE");
        res.status(201).json({ message: "Sale recorded successfully!" });

    } catch (err) {
        console.error("🚨 SQL ERROR IN saveSale:", err.message);
        res.status(500).json({ 
            message: "Failed to save sale", 
            error: err.message 
        });
    }
};

// 2. GET SALES LIST (For the History Table)
exports.getSalesList = async (req, res) => {
    const branchId = req.headers['branch-id'] || 1;
    try {
        const [rows] = await db.execute(
            "SELECT * FROM sales WHERE branch_id = ? ORDER BY id DESC",
            [branchId]
        );
        res.json(rows);
    } catch (err) { 
        console.error("🚨 ERROR FETCHING SALES:", err.message);
        res.status(500).json({ error: err.message }); 
    }
};
const express = require('express');
const router = express.Router();

// Controllers
const auth = require('../controllers/authController');
const master = require('../controllers/masterController');
const trans = require('../controllers/transactionController');
const reportController = require('../controllers/reportController');
const expenseController = require('../controllers/expenseController');
const salesController = require('../controllers/salesController');
const serviceController = require('../controllers/serviceController');
const inquiryController = require('../controllers/inquiryController');

// Middleware Guards
const { verifyToken, isAdmin } = require('../middleware/authMiddleware');

// ==============================
// 🟢 PUBLIC ROUTES (No Token Needed)
// ==============================
router.post('/login', auth.login);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);

// ==============================
// 🔴 ADMIN ONLY ROUTES
// ==============================
router.post('/create-staff', verifyToken, isAdmin, auth.createStaff);

// ==============================
// 🟡 PROTECTED ROUTES (Token Required)
// ==============================

// MASTER MODULE
router.get('/models', verifyToken, master.getModels);
router.post('/add-model', verifyToken, master.addModel);
router.get('/suppliers', verifyToken, master.getSuppliers);
router.post('/add-supplier', verifyToken, master.addSupplier);
router.get('/parts', verifyToken, master.getParts);
router.post('/add-part', verifyToken, master.addPart);
router.get('/customers-list', verifyToken, master.getCustomers);
router.post('/add-customer', verifyToken, master.addCustomer);
router.get('/service-menu', verifyToken, master.getServiceMenu);
router.post('/add-service-item', verifyToken, master.addServiceItem);

// SALES
router.get('/sales/list', verifyToken, salesController.getSalesList);
router.post('/save-sale', verifyToken, trans.saveSale);

// SERVICE JOBS (MASTER & INWARD)
router.get('/cust-inward-no', verifyToken, serviceController.getCustInwardNo);
router.post('/save-service-job', verifyToken, serviceController.saveServiceJobMaster); 
router.get('/service-jobs', verifyToken, serviceController.getServiceJobs);          
router.get('/service/list', verifyToken, serviceController.getServiceJobs);          

// CUSTOMER OUTWARD (CLOSE JOB)
router.get('/pending-jobcards', verifyToken, serviceController.getPendingJobCards);
router.post('/save-cust-outward', verifyToken, serviceController.saveCustomerOutward);

// SUPPLIER OUTWARD (SEND TO COMPANY)
router.get('/outward-no', verifyToken, serviceController.getOutwardNo);
router.post('/save-outward', verifyToken, serviceController.saveOutward);
router.get('/supplier-outward/list', verifyToken, serviceController.getSupplierOutwards);
router.get('/pending-customer-parts', verifyToken, serviceController.getPendingCustomerParts);

// WARRANTY & SUPPLIER RECONCILIATION
router.get('/warranty-report', verifyToken, serviceController.getWarrantyReport);       
router.get('/warranty-master', verifyToken, serviceController.getWarrantyMasterReport); 
router.get('/supplier-inward-no', verifyToken, serviceController.getInwardNo); 
router.get('/pending-supplier-outwards', verifyToken, serviceController.getPendingSupplierOutwards);
router.post('/save-supplier-inward', verifyToken, serviceController.saveSupplierInward);

// EXPENSES
router.post('/expenses/add', verifyToken, expenseController.addExpense);
router.get('/expenses/list', verifyToken, expenseController.getExpenses);

// REPORTS
router.get('/reports/sales-history', verifyToken, reportController.getSalesHistory);
router.get('/reports/pending-jobs', verifyToken, reportController.getPendingJobs);
router.get('/reports/completed-jobs', verifyToken, reportController.getCompletedJobs);
router.get('/reports/supplier-pending', verifyToken, reportController.getPendingSupplier);
router.get('/reports/supplier-completed', verifyToken, reportController.getCompletedSupplier);
router.get('/reports/dashboard-stats', verifyToken, reportController.getDashboardStats);

// SERVICE OUTWARD / BILLING
router.get('/service-out-no', verifyToken, serviceController.getServiceOutNo);
router.get('/pending-service-jobs', verifyToken, serviceController.getPendingServiceJobs);
router.post('/save-service-bill', verifyToken, serviceController.saveServiceBill);

// INQUIRIES
router.post('/inquiries', verifyToken, inquiryController.createInquiry);
router.get('/inquiries', verifyToken, inquiryController.getInquiries);
router.put('/inquiries/:id/status', verifyToken, inquiryController.updateInquiryStatus);

// ==============================
// DASHBOARD SUMMARY
// ==============================
router.get('/dashboard-summary', verifyToken, async (req, res) => {
    try {
        const db = require('../config/db');
        // You can now securely pull branchId directly from the validated token!
        const branchId = req.user.branchId || req.query.branch || 1;

        const [sales] = await db.execute(
            `SELECT SUM(price) as total FROM sales WHERE DATE(created_at) = CURDATE() AND branch_id = ?`,
            [branchId]
        );

        const [jobs] = await db.execute(
            `SELECT COUNT(*) as count 
             FROM service_job_in jc
             LEFT JOIN customer_outward co ON jc.job_no = co.inward_no
             WHERE co.inward_no IS NULL AND jc.branch_id = ?`,
            [branchId]
        );

        const [cust] = await db.execute(
            `SELECT COUNT(*) as count FROM customers_master WHERE branch_id = ?`,
            [branchId]
        );

        res.json({
            stats: {
                todaySales: sales[0].total || 0,
                pendingJobs: jobs[0].count || 0,
                totalCustomers: cust[0].count || 0,
                lowStock: 0
            }
        });

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ error: 'Dashboard summary failed', message: err.message });
    }
});

module.exports = router;
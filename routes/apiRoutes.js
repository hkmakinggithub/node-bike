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

// ==============================
// AUTH
// ==============================
router.post('/login', auth.login);

// ==============================
// MASTER MODULE
// ==============================
router.get('/models', master.getModels);
router.post('/add-model', master.addModel);
router.get('/suppliers', master.getSuppliers);
router.post('/add-supplier', master.addSupplier);
router.get('/parts', master.getParts);
router.post('/add-part', master.addPart);
router.get('/customers-list', master.getCustomers);
router.post('/add-customer', master.addCustomer);
router.get('/service-menu', master.getServiceMenu);
router.post('/add-service-item', master.addServiceItem);

// ==============================
// SALES
// ==============================
router.get('/sales/list', salesController.getSalesList);
router.post('/save-sale', trans.saveSale);

// ==============================
// SERVICE JOBS (MASTER & INWARD)
// ==============================
router.get('/cust-inward-no', serviceController.getCustInwardNo);
router.post('/save-service-job', serviceController.saveServiceJobMaster); 
router.get('/service-jobs', serviceController.getServiceJobs);          
router.get('/service/list', serviceController.getServiceJobs);          

// ==============================
// CUSTOMER OUTWARD (CLOSE JOB)
// ==============================
router.get('/pending-jobcards', serviceController.getPendingJobCards);
router.post('/save-cust-outward', serviceController.saveCustomerOutward);

// ==============================
// 🚨 NEW: SUPPLIER OUTWARD (SEND TO COMPANY) 🚨
// ==============================
// THESE 4 LINES FIX YOUR 404 ERRORS ON THE SUPPLIER PAGE!
router.get('/outward-no', serviceController.getOutwardNo);
router.post('/save-outward', serviceController.saveOutward);
router.get('/supplier-outward/list', serviceController.getSupplierOutwards);
router.get('/pending-customer-parts', serviceController.getPendingCustomerParts);

// ==============================
// WARRANTY & SUPPLIER RECONCILIATION
// ==============================
router.get('/warranty-report', serviceController.getWarrantyReport);       
router.get('/warranty-master', serviceController.getWarrantyMasterReport); 

// Added the missing Inward No route here too just in case!
router.get('/supplier-inward-no', serviceController.getInwardNo); 
router.get('/pending-supplier-outwards', serviceController.getPendingSupplierOutwards);
router.post('/save-supplier-inward', serviceController.saveSupplierInward);

// ==============================
// EXPENSES
// ==============================
router.post('/expenses/add', expenseController.addExpense);
router.get('/expenses/list', expenseController.getExpenses);

// ==============================
// REPORTS
// ==============================
router.get('/reports/sales-history', reportController.getSalesHistory);
router.get('/reports/pending-jobs', reportController.getPendingJobs);
router.get('/reports/completed-jobs', reportController.getCompletedJobs);
router.get('/reports/supplier-pending', reportController.getPendingSupplier);
router.get('/reports/supplier-completed', reportController.getCompletedSupplier);
router.get('/reports/dashboard-stats', reportController.getDashboardStats);
// Add these with your other Service Jobs routes
router.get('/service-out-no', serviceController.getServiceOutNo);
router.get('/pending-service-jobs', serviceController.getPendingServiceJobs);
router.post('/save-service-bill', serviceController.saveServiceBill);
// ==============================
// DASHBOARD SUMMARY (FIXED TABLE NAMES)
// ==============================
router.get('/dashboard-summary', async (req, res) => {
    try {
        const db = require('../config/db');
        const branchId = req.query.branch || 1;

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
// ==============================
// AUTH
// ==============================
router.post('/login', auth.login);
router.post('/create-staff', auth.createStaff); // 👈 ADD THIS LINE!


router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);


// 1. Import the new controller at the top of your file
const inquiryController = require('../controllers/inquiryController');

// 2. Add this route with your other API routes
// Note: If you have a middleware to verify the JWT token (like verifyToken), add it here!
router.post('/inquiries', inquiryController.createInquiry);
// Add this under your router.post('/inquiries', ...) line
router.get('/inquiries', inquiryController.getInquiries);

// Add this right under your other inquiry routes!
router.put('/inquiries/:id/status', inquiryController.updateInquiryStatus);
module.exports = router;
const express = require('express');

function createReportRoutes(reportController, adminOnly) {
    const router = express.Router();

    router.get('/sales', ...adminOnly, (req, res, next) => reportController.getSalesReport(req, res, next));

    return router;
}

module.exports = createReportRoutes;

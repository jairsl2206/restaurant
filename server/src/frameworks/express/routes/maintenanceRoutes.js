const express = require('express');

function createMaintenanceRoutes(maintenanceController, adminOnly) {
    const router = express.Router();

    router.delete('/menu/all', ...adminOnly, (req, res, next) => maintenanceController.clearMenu(req, res, next));
    router.delete('/orders/all', ...adminOnly, (req, res, next) => maintenanceController.clearOrders(req, res, next));

    return router;
}

module.exports = createMaintenanceRoutes;

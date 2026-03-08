class MaintenanceController {
    constructor({ maintenanceUseCases }) {
        this.maintenanceUseCases = maintenanceUseCases;
    }

    async clearMenu(req, res, next) {
        try {
            await this.maintenanceUseCases.clearMenu();
            res.json({ success: true, message: 'Menu cleared' });
        } catch (error) {
            next(error);
        }
    }

    async clearOrders(req, res, next) {
        try {
            await this.maintenanceUseCases.clearOrders();
            res.json({ success: true, message: 'Orders cleared' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = MaintenanceController;

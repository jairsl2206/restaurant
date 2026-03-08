const express = require('express');

function createSettingsRoutes(settingsController, adminOnly) {
    const router = express.Router();

    router.get('/', (req, res, next) => settingsController.getSettings(req, res, next));
    router.post('/', ...adminOnly, (req, res, next) => settingsController.updateSettings(req, res, next));

    return router;
}

module.exports = createSettingsRoutes;

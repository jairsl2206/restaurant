const express = require('express');

function createWhatsAppRoutes(whatsappController, adminOnly) {
    const router = express.Router();

    router.get('/status', (req, res, next) => whatsappController.getStatus(req, res, next));
    router.get('/groups', (req, res, next) => whatsappController.getGroups(req, res, next));
    router.post('/reset', ...adminOnly, (req, res, next) => whatsappController.resetSession(req, res, next));

    return router;
}

module.exports = createWhatsAppRoutes;

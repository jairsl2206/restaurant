const express = require('express');

function createPromotionRoutes(promotionController, adminOnly) {
    const router = express.Router();

    router.get('/', (req, res, next) => promotionController.getPromotions(req, res, next));
    router.post('/', ...adminOnly, (req, res, next) => promotionController.createPromotion(req, res, next));
    router.put('/:id', ...adminOnly, (req, res, next) => promotionController.updatePromotion(req, res, next));
    router.delete('/:id', ...adminOnly, (req, res, next) => promotionController.deletePromotion(req, res, next));

    return router;
}

module.exports = createPromotionRoutes;

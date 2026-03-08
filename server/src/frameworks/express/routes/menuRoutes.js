const express = require('express');

function createMenuRoutes(menuController, authMiddleware, adminOnly) {
    const router = express.Router();

    // Public read access (any authenticated user can see menu)
    router.get('/', ...authMiddleware, (req, res, next) => menuController.getMenu(req, res, next));

    // Admin-only write operations
    router.post('/', ...adminOnly, (req, res, next) => menuController.createItem(req, res, next));
    router.put('/:id', ...adminOnly, (req, res, next) => menuController.updateItem(req, res, next));
    router.delete('/:id', ...adminOnly, (req, res, next) => menuController.deleteItem(req, res, next));

    return router;
}

module.exports = createMenuRoutes;

const express = require('express');

function createUserRoutes(userController, adminOnly) {
    const router = express.Router();

    router.get('/', ...adminOnly, (req, res, next) => userController.getUsers(req, res, next));
    router.post('/', ...adminOnly, (req, res, next) => userController.createUser(req, res, next));
    router.put('/:id', ...adminOnly, (req, res, next) => userController.updateUser(req, res, next));
    router.delete('/:id', ...adminOnly, (req, res, next) => userController.deleteUser(req, res, next));

    return router;
}

module.exports = createUserRoutes;

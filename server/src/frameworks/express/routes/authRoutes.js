const express = require('express');

function createAuthRoutes(authController, authenticate) {
    const router = express.Router();
    router.post('/login', (req, res, next) => authController.login(req, res, next));
    router.get('/verify-session', authenticate, (req, res, next) => authController.verifySession(req, res, next));
    return router;
}

module.exports = createAuthRoutes;

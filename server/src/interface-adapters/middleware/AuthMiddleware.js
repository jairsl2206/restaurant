const jwt = require('jsonwebtoken');
const { UnauthorizedError, ForbiddenError } = require('../../shared/errors/errorTypes');

/**
 * AuthMiddleware
 * Verifies JWT tokens and attaches the user payload to req.user.
 * Receives jwtSecret via closure — no process.env access.
 */
function createAuthMiddleware(jwtSecret) {
    /**
     * authenticate — verifies token, attaches req.user
     */
    function authenticate(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

        if (!token) {
            return next(new UnauthorizedError('Authentication token is required'));
        }

        try {
            const payload = jwt.verify(token, jwtSecret);
            req.user = payload; // { userId, username, role }
            next();
        } catch (err) {
            next(new UnauthorizedError('Invalid or expired token'));
        }
    }

    /**
     * requireRole — restricts access to specific roles
     * @param {...string} roles - Allowed roles (e.g., 'admin', 'waiter')
     */
    function requireRole(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return next(new UnauthorizedError('Authentication required'));
            }
            if (!roles.includes(req.user.role)) {
                return next(new ForbiddenError(`Access denied. Required roles: ${roles.join(', ')}`));
            }
            next();
        };
    }

    return { authenticate, requireRole };
}

module.exports = createAuthMiddleware;

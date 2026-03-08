const { AppError } = require('../../shared/errors/errorTypes');

/**
 * Create the global error handler middleware.
 * @param {Object} logger - Winston logger instance (injected)
 */
function createErrorHandler(logger) {
    return function errorHandler(err, req, res, next) {
        // Operational errors (expected, user-facing)
        if (err instanceof AppError && err.isOperational) {
            logger.warn(`[${err.statusCode}] ${err.message}`, { path: req.path, method: req.method });
            return res.status(err.statusCode).json({
                error: err.message,
                status: err.statusCode
            });
        }

        // Unexpected programming errors
        logger.error(`[Unexpected Error] ${err.message}`, { stack: err.stack, path: req.path });
        res.status(500).json({
            error: 'Internal server error',
            status: 500
        });
    };
}

module.exports = createErrorHandler;

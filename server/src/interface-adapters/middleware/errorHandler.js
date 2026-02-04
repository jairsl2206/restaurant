const { AppError } = require('../../shared/errors/errorTypes');

/**
 * Global error handler middleware
 */
function errorHandler(err, req, res, next) {
    // Log error for debugging
    console.error('[Error]', err);

    // Handle operational errors (expected errors)
    if (err instanceof AppError && err.isOperational) {
        return res.status(err.statusCode).json({
            error: err.message,
            status: err.statusCode
        });
    }

    // Handle unexpected errors
    console.error('[Unexpected Error]', err.stack);
    res.status(500).json({
        error: 'Internal server error',
        status: 500
    });
}

module.exports = errorHandler;

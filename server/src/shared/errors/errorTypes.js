const AppError = require('./AppError');

/**
 * Validation error (400)
 */
class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

/**
 * Not found error (404)
 */
class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404);
    }
}

/**
 * Unauthorized error (401)
 */
class UnauthorizedError extends AppError {
    constructor(message) {
        super(message, 401);
    }
}

/**
 * Forbidden error (403)
 */
class ForbiddenError extends AppError {
    constructor(message) {
        super(message, 403);
    }
}

/**
 * Database error (500)
 */
class DatabaseError extends AppError {
    constructor(message) {
        super(message, 500);
    }
}

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    DatabaseError
};

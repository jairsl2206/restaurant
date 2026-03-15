const AppError = require('../../../src/shared/errors/AppError');
const {
    ValidationError,
    NotFoundError,
    UnauthorizedError,
    ForbiddenError,
    DatabaseError
} = require('../../../src/shared/errors/errorTypes');

describe('AppError', () => {
    test('should create error with default values', () => {
        const error = new AppError('Something went wrong');

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe('Something went wrong');
        expect(error.statusCode).toBe(500);
        expect(error.isOperational).toBe(true);
        expect(error.name).toBe('AppError');
    });

    test('should create error with custom status code', () => {
        const error = new AppError('Bad request', 400);

        expect(error.statusCode).toBe(400);
    });

    test('should create non-operational error', () => {
        const error = new AppError('Critical error', 500, false);

        expect(error.isOperational).toBe(false);
    });

    test('should capture stack trace', () => {
        const error = new AppError('Test error');

        expect(error.stack).toBeDefined();
        expect(typeof error.stack).toBe('string');
    });

    test('should be instanceof Error', () => {
        const error = new AppError('Test');

        expect(error).toBeInstanceOf(Error);
    });
});

describe('ValidationError', () => {
    test('should create error with 400 status code', () => {
        const error = new ValidationError('Invalid input');

        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Invalid input');
        expect(error.statusCode).toBe(400);
        expect(error.name).toBe('ValidationError');
    });

    test('should be operational', () => {
        const error = new ValidationError('Bad data');

        expect(error.isOperational).toBe(true);
    });
});

describe('NotFoundError', () => {
    test('should create error with 404 status code', () => {
        const error = new NotFoundError('Resource not found');

        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Resource not found');
        expect(error.statusCode).toBe(404);
        expect(error.name).toBe('NotFoundError');
    });

    test('should be operational', () => {
        const error = new NotFoundError('Order not found');

        expect(error.isOperational).toBe(true);
    });
});

describe('UnauthorizedError', () => {
    test('should create error with 401 status code', () => {
        const error = new UnauthorizedError('Unauthorized');

        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Unauthorized');
        expect(error.statusCode).toBe(401);
        expect(error.name).toBe('UnauthorizedError');
    });

    test('should be operational', () => {
        const error = new UnauthorizedError('Token expired');

        expect(error.isOperational).toBe(true);
    });
});

describe('ForbiddenError', () => {
    test('should create error with 403 status code', () => {
        const error = new ForbiddenError('Forbidden');

        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Forbidden');
        expect(error.statusCode).toBe(403);
        expect(error.name).toBe('ForbiddenError');
    });

    test('should be operational', () => {
        const error = new ForbiddenError('Permission denied');

        expect(error.isOperational).toBe(true);
    });
});

describe('DatabaseError', () => {
    test('should create error with 500 status code', () => {
        const error = new DatabaseError('Database connection failed');

        expect(error).toBeInstanceOf(AppError);
        expect(error.message).toBe('Database connection failed');
        expect(error.statusCode).toBe(500);
        expect(error.name).toBe('DatabaseError');
    });

    test('should be operational', () => {
        const error = new DatabaseError('Query failed');

        expect(error.isOperational).toBe(true);
    });
});

describe('Error exports', () => {
    test('should export all error types', () => {
        const errorTypes = require('../../../src/shared/errors/errorTypes');

        expect(errorTypes.AppError).toBe(AppError);
        expect(errorTypes.ValidationError).toBe(ValidationError);
        expect(errorTypes.NotFoundError).toBe(NotFoundError);
        expect(errorTypes.UnauthorizedError).toBe(UnauthorizedError);
        expect(errorTypes.ForbiddenError).toBe(ForbiddenError);
        expect(errorTypes.DatabaseError).toBe(DatabaseError);
    });
});

describe('Error inheritance chain', () => {
    test('all errors should inherit from AppError', () => {
        expect(new ValidationError('')).toBeInstanceOf(AppError);
        expect(new NotFoundError('')).toBeInstanceOf(AppError);
        expect(new UnauthorizedError('')).toBeInstanceOf(AppError);
        expect(new ForbiddenError('')).toBeInstanceOf(AppError);
        expect(new DatabaseError('')).toBeInstanceOf(AppError);
    });

    test('all errors should inherit from Error', () => {
        expect(new ValidationError('')).toBeInstanceOf(Error);
        expect(new NotFoundError('')).toBeInstanceOf(Error);
        expect(new UnauthorizedError('')).toBeInstanceOf(Error);
        expect(new ForbiddenError('')).toBeInstanceOf(Error);
        expect(new DatabaseError('')).toBeInstanceOf(Error);
    });
});

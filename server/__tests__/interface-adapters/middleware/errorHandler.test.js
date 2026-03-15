const errorHandler = require('../../../src/interface-adapters/middleware/errorHandler');
const { AppError, ValidationError, NotFoundError } = require('../../../src/shared/errors/errorTypes');

describe('errorHandler Middleware', () => {
    let err;
    let req;
    let res;
    let next;

    beforeEach(() => {
        err = new Error('Test error');
        req = {};
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();

        // Suppress console.error during tests
        jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        console.error.mockRestore();
    });

    describe('operational AppError handling', () => {
        test('should handle ValidationError with 400 status', () => {
            const validationError = new ValidationError('Invalid input data');

            errorHandler(validationError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Invalid input data',
                status: 400
            });
        });

        test('should handle NotFoundError with 404 status', () => {
            const notFoundError = new NotFoundError('Resource not found');

            errorHandler(notFoundError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Resource not found',
                status: 404
            });
        });

        test('should handle AppError with custom status code', () => {
            const customError = new AppError('Forbidden', 403, true);

            errorHandler(customError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Forbidden',
                status: 403
            });
        });

        test('should log error to console', () => {
            const appError = new AppError('Test', 400, true);

            errorHandler(appError, req, res, next);

            expect(console.error).toHaveBeenCalledWith('[Error]', appError);
        });
    });

    describe('unexpected error handling', () => {
        test('should handle generic Error with 500 status', () => {
            const genericError = new Error('Unexpected error');

            errorHandler(genericError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                status: 500
            });
        });

        test('should handle non-Error objects', () => {
            const nonError = { message: 'Something went wrong' };

            errorHandler(nonError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('should log unexpected error stack', () => {
            const genericError = new Error('Unexpected error');

            errorHandler(genericError, req, res, next);

            expect(console.error).toHaveBeenCalledWith('[Unexpected Error]', genericError.stack);
        });

        test('should handle null error', () => {
            errorHandler(null, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                status: 500
            });
        });

        test('should handle undefined error', () => {
            errorHandler(undefined, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('non-operational AppError handling', () => {
        test('should treat non-operational AppError as unexpected', () => {
            const nonOperationalError = new AppError('Critical error', 500, false);

            errorHandler(nonOperationalError, req, res, next);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: 'Internal server error',
                status: 500
            });
        });
    });

    describe('error response structure', () => {
        test('should always include error and status in response', () => {
            const validationError = new ValidationError('Bad request');

            errorHandler(validationError, req, res, next);

            const response = res.json.mock.calls[0][0];
            expect(response).toHaveProperty('error');
            expect(response).toHaveProperty('status');
            expect(typeof response.error).toBe('string');
            expect(typeof response.status).toBe('number');
        });
    });
});

const request = require('supertest');
const createApp = require('../../../src/frameworks/express/app');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('Auth API (Integration)', () => {
    let app;
    let mockContainer;
    let mockUserRepository;

    beforeEach(() => {
        // Mock User Repository
        mockUserRepository = {
            findByUsername: jest.fn()
        };

        // Minimal mock container
        mockContainer = {
            resolve: (name) => {
                const dependencies = {
                    'logger': { info: jest.fn(), error: jest.fn(), warn: jest.fn() },
                    'jwtSecret': 'test-secret',
                    'authController': require('../../../src/interface-adapters/controllers/AuthController'),
                    'loginUserUseCase': {
                        execute: async ({ username, password }) => {
                            if (!username || !password) throw new ValidationError('Missing credentials');
                            if (username === 'admin' && password === 'valid') {
                                return { success: true, token: 'fake-jwt-token', user: { id: 1, username: 'admin', role: 'admin' } };
                            }
                            throw new ValidationError('Invalid credentials');
                        }
                    }
                };

                // If it's the controller class, we need to instantiate it or mock it
                if (name === 'authController') {
                    const AuthController = dependencies[name];
                    return new AuthController({ loginUserUseCase: dependencies['loginUserUseCase'] });
                }

                return dependencies[name];
            }
        };

        app = createApp(mockContainer);
    });

    test('POST /api/v2/auth/login - Success', async () => {
        const response = await request(app)
            .post('/api/v2/auth/login')
            .send({ username: 'admin', password: 'valid' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
    });

    test('POST /api/v2/auth/login - Failure', async () => {
        const response = await request(app)
            .post('/api/v2/auth/login')
            .send({ username: 'admin', password: 'wrong' });

        expect(response.status).toBe(400); // 400 because ValidationError results in 400 in our handler
        expect(response.body.error).toBeDefined();
    });

    test('GET /health - Success', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('OK');
    });
});

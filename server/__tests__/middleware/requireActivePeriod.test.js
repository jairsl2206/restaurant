const requireActivePeriod = require('../../middleware/requireActivePeriod');

// ── helpers ───────────────────────────────────────────────────────────────────

const makeRes = () => {
    const res = { status: jest.fn(), json: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
};

const makeReq = () => ({});

// ── tests ─────────────────────────────────────────────────────────────────────

describe('requireActivePeriod middleware', () => {
    describe('when getActiveSalePeriod returns an active period', () => {
        const activePeriod = { id: 3, business_date: '2026-03-15', closed_at: null };
        let mockDb;

        beforeEach(() => {
            mockDb = { getActiveSalePeriod: jest.fn((cb) => cb(null, activePeriod)) };
        });

        test('calls next() to continue the chain', (done) => {
            const middleware = requireActivePeriod(mockDb);
            const req = makeReq();
            middleware(req, makeRes(), () => done());
        });

        test('attaches activePeriod to req for downstream handlers', (done) => {
            const middleware = requireActivePeriod(mockDb);
            const req = makeReq();
            middleware(req, makeRes(), () => {
                expect(req.activePeriod).toBe(activePeriod);
                done();
            });
        });

        test('does NOT send any response', (done) => {
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, () => {
                expect(res.status).not.toHaveBeenCalled();
                expect(res.json).not.toHaveBeenCalled();
                done();
            });
        });
    });

    describe('when no active period exists (closed jornada)', () => {
        let mockDb;

        beforeEach(() => {
            mockDb = { getActiveSalePeriod: jest.fn((cb) => cb(null, null)) };
        });

        test('responds with 403', () => {
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('responds with an error message in Spanish', () => {
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, jest.fn());
            const body = res.json.mock.calls[0][0];
            expect(body).toHaveProperty('error');
            expect(body.error).toMatch(/jornada/i);
        });

        test('does NOT call next()', () => {
            const middleware = requireActivePeriod(mockDb);
            const next = jest.fn();
            middleware(makeReq(), makeRes(), next);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('when getActiveSalePeriod returns an empty-ish value', () => {
        test('treats undefined as no active period → 403', () => {
            const mockDb = { getActiveSalePeriod: jest.fn((cb) => cb(null, undefined)) };
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(403);
        });

        test('treats {} without id as… passes through (truthy object)', () => {
            // An object without id is still truthy — guard does not inspect schema
            const mockDb = { getActiveSalePeriod: jest.fn((cb) => cb(null, { id: 1 })) };
            const middleware = requireActivePeriod(mockDb);
            const next = jest.fn();
            middleware(makeReq(), makeRes(), next);
            expect(next).toHaveBeenCalled();
        });
    });

    describe('when getActiveSalePeriod returns a database error', () => {
        const dbError = new Error('disk read failure');
        let mockDb;

        beforeEach(() => {
            mockDb = { getActiveSalePeriod: jest.fn((cb) => cb(dbError, null)) };
        });

        test('responds with 500', () => {
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, jest.fn());
            expect(res.status).toHaveBeenCalledWith(500);
        });

        test('responds with a database error message', () => {
            const middleware = requireActivePeriod(mockDb);
            const res = makeRes();
            middleware(makeReq(), res, jest.fn());
            const body = res.json.mock.calls[0][0];
            expect(body).toHaveProperty('error');
        });

        test('does NOT call next() on db error', () => {
            const middleware = requireActivePeriod(mockDb);
            const next = jest.fn();
            middleware(makeReq(), makeRes(), next);
            expect(next).not.toHaveBeenCalled();
        });
    });

    describe('factory function', () => {
        test('returns a function when called with a db instance', () => {
            const mockDb = { getActiveSalePeriod: jest.fn() };
            expect(typeof requireActivePeriod(mockDb)).toBe('function');
        });

        test('returned middleware accepts (req, res, next)', () => {
            const mockDb = { getActiveSalePeriod: jest.fn() };
            const middleware = requireActivePeriod(mockDb);
            expect(middleware.length).toBe(3);
        });
    });
});

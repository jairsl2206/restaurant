const OrderRepository = require('../../../src/infrastructure/database/repositories/OrderRepository');
const Order = require('../../../src/domain/entities/Order');
const OrderItem = require('../../../src/domain/entities/OrderItem');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { DatabaseError, NotFoundError } = require('../../../src/shared/errors/errorTypes');

describe('OrderRepository', () => {
    let mockDb;
    let repository;

    // A minimal valid item row returned by db.all for order_items queries
    const itemRow = (orderId = 1) => ({
        id: 1,
        order_id: orderId,
        menu_item_id: 1,
        item_name: 'Pizza',
        quantity: 2,
        unit_price: 150,
        discount_amount: 0
    });

    beforeEach(() => {
        mockDb = {
            run: jest.fn(),
            get: jest.fn(),
            all: jest.fn(),
            prepare: jest.fn().mockReturnValue({
                run: jest.fn(),
                finalize: jest.fn((cb) => cb ? cb() : undefined)
            }),
            serialize: jest.fn((callback) => callback())
        };
        repository = new OrderRepository(mockDb);
    });

    describe('save', () => {
        const validOrder = new Order({
            id: null,
            branchId: 1,
            customerId: 100,
            waiterId: 50,
            tableNumber: 5,
            type: 'DINE_IN',
            status: OrderStatus.CREADA,
            items: [
                new OrderItem({
                    id: null,
                    menuItemId: 10,
                    itemName: 'Pizza',
                    quantity: 2,
                    unitPrice: 150,
                    discountAmount: 0
                })
            ],
            discountTotal: 0,
            taxTotal: 0,
            notes: null
        });

        const mockSaveSuccess = () => {
            mockDb.run.mockImplementation(function(sql, params, callback) {
                if (typeof callback === 'function') callback.call({ lastID: 1 }, null);
            });
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1, branch_id: 1, status: 'CREADA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, [itemRow(1)]);
            });
        };

        test('should insert order into database', async () => {
            mockSaveSuccess();

            await repository.save(validOrder);

            expect(mockDb.run).toHaveBeenCalled();
            const [sql] = mockDb.run.mock.calls[0];
            expect(sql).toContain('INSERT INTO orders');
        });

        test('should use default branchId when not provided', async () => {
            const order = new Order({
                id: null,
                branchId: null,
                status: OrderStatus.CREADA,
                items: [new OrderItem({ itemName: 'Item', quantity: 1, unitPrice: 100 })]
            });

            mockSaveSuccess();

            await repository.save(order);

            const [, params] = mockDb.run.mock.calls[0];
            expect(params[0]).toBe(1); // branch_id should be 1 (default)
        });

        test('should throw DatabaseError on insert failure', async () => {
            mockDb.run.mockImplementation(function(sql, params, callback) {
                if (typeof callback === 'function') callback.call({}, new Error('Insert failed'));
            });

            await expect(repository.save(validOrder))
                .rejects.toThrow(DatabaseError);
            await expect(repository.save(validOrder))
                .rejects.toThrow('Failed to save order');
        });

        test('should handle successful save', async () => {
            mockSaveSuccess();

            const result = await repository.save(validOrder);
            expect(result).toBeDefined();
        });
    });

    describe('findById', () => {
        const orderRow = {
            id: 1,
            branch_id: 1,
            customer_id: 100,
            waiter_id: 50,
            table_number: 5,
            type: 'DINE_IN',
            status: 'CREADA',
            discount_total: 0,
            tax_total: 0,
            notes: null,
            created_at: '2024-01-01T00:00:00.000Z',
            updated_at: '2024-01-01T00:00:00.000Z'
        };

        const itemRows = [
            {
                id: 1,
                order_id: 1,
                menu_item_id: 10,
                item_name: 'Pizza',
                quantity: 2,
                unit_price: 150,
                discount_amount: 0
            }
        ];

        test('should return Order when found', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, orderRow);
            });
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, itemRows);
            });

            const result = await repository.findById(1);

            expect(result).toBeInstanceOf(Order);
            expect(result.id).toBe(1);
            expect(result.status.value).toBe('CREADA');
        });

        test('should return null when order not found', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, null);
            });

            const result = await repository.findById(999);

            expect(result).toBeNull();
        });

        test('should throw DatabaseError on query failure', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(new Error('Query failed'), null);
            });

            await expect(repository.findById(1))
                .rejects.toThrow(DatabaseError);
        });

        test('should map items correctly', async () => {
            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, orderRow);
            });
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, itemRows);
            });

            const result = await repository.findById(1);

            expect(result.items).toHaveLength(1);
            expect(result.items[0]).toBeInstanceOf(OrderItem);
            expect(result.items[0].itemName).toBe('Pizza');
        });
    });

    describe('findAll', () => {
        test('should return array of orders', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [{ id: 1 }, { id: 2 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    // item queries — return at least one item so Order entity validates
                    callback(null, [itemRow(params && params[0])]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: params[0],
                    branch_id: 1,
                    status: 'CREADA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            const results = await repository.findAll();

            expect(Array.isArray(results)).toBe(true);
        });

        test('should throw DatabaseError on query failure', async () => {
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(new Error('Query failed'), null);
            });

            await expect(repository.findAll())
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('findActive', () => {
        test('should exclude ENTREGADA and CANCELADA orders', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    expect(params).toContain(OrderStatus.ENTREGADA);
                    expect(params).toContain(OrderStatus.CANCELADA);
                    callback(null, [{ id: 1 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow(params && params[0])]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    branch_id: 1,
                    status: 'CREADA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            await repository.findActive();

            expect(mockDb.all).toHaveBeenCalled();
        });
    });

    describe('findByStatus', () => {
        test('should return orders with specified status', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    expect(params).toContain('CREADA');
                    callback(null, [{ id: 1 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow(params && params[0])]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    branch_id: 1,
                    status: 'CREADA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            const results = await repository.findByStatus('CREADA');

            expect(Array.isArray(results)).toBe(true);
        });
    });

    describe('update', () => {
        const validOrder = new Order({
            id: 1,
            branchId: 1,
            status: OrderStatus.PREPARANDO,
            items: [new OrderItem({ itemName: 'Item', quantity: 1, unitPrice: 100 })],
            tableNumber: 5
        });

        test('should update order in database', async () => {
            // serialize calls callback synchronously; run calls without callback (BEGIN/COMMIT)
            // must be handled gracefully
            mockDb.run.mockImplementation((sql, params, callback) => {
                if (typeof params === 'function') params(null);
                else if (typeof callback === 'function') callback(null);
            });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    branch_id: 1,
                    status: 'PREPARANDO',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, [itemRow(1)]);
            });

            await repository.update(validOrder);

            expect(mockDb.run).toHaveBeenCalled();
        });

        test('should throw DatabaseError on update failure', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                if (typeof params === 'function') params(new Error('Update failed'));
                else if (typeof callback === 'function') callback(new Error('Update failed'));
            });

            await expect(repository.update(validOrder))
                .rejects.toThrow(DatabaseError);
        });
    });

    describe('delete', () => {
        test('should delete order and return true on success', async () => {
            mockDb.run.mockImplementation(function(sql, params, callback) {
                if (typeof params === 'function') params.call({ changes: 1 }, null);
                else if (typeof callback === 'function') callback.call({ changes: 1 }, null);
            });

            const result = await repository.delete(1);

            expect(result).toBe(true);
        });

        test('should return false when order not found', async () => {
            mockDb.run.mockImplementation(function(sql, params, callback) {
                if (typeof params === 'function') params.call({ changes: 0 }, null);
                else if (typeof callback === 'function') callback.call({ changes: 0 }, null);
            });

            const result = await repository.delete(999);

            expect(result).toBe(false);
        });

        test('should throw DatabaseError on delete failure', async () => {
            mockDb.run.mockImplementation((sql, params, callback) => {
                if (typeof params === 'function') params(new Error('Delete failed'));
                else if (typeof callback === 'function') callback(new Error('Delete failed'));
            });

            await expect(repository.delete(1))
                .rejects.toThrow(DatabaseError);
        });
    });
});

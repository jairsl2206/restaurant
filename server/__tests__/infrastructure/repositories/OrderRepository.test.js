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
            status: OrderStatus.EN_COCINA,
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
                    id: 1, branch_id: 1, status: 'EN_COCINA',
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
                status: OrderStatus.EN_COCINA,
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
            status: 'EN_COCINA',
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
            expect(result.status.value).toBe('EN_COCINA');
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
                    status: 'EN_COCINA',
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
        test('should exclude FINALIZADO and LISTO_PARA_RECOGER orders', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    expect(params).toContain(OrderStatus.FINALIZADO);
                    expect(params).toContain(OrderStatus.LISTO_PARA_RECOGER);
                    callback(null, [{ id: 1 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow(params && params[0])]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    branch_id: 1,
                    status: 'EN_COCINA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            await repository.findActive();

            expect(mockDb.all).toHaveBeenCalled();
        });

        test('FIFO: should query orders by created_at ASC (oldest first)', async () => {
            let capturedSql = '';
            mockDb.all.mockImplementation((sql, params, callback) => {
                capturedSql = sql;
                callback(null, []);
            });

            await repository.findActive();

            expect(capturedSql).toMatch(/ORDER BY created_at ASC/i);
        });

        test('FIFO: should return orders in creation order (oldest first)', async () => {
            const t1 = '2024-01-01 08:00:00';
            const t2 = '2024-01-01 08:05:00';
            const t3 = '2024-01-01 08:10:00';

            // db.all returns ids already sorted ASC by the query
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [{ id: 1 }, { id: 2 }, { id: 3 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow()]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                const id = params[0];
                const times = { 1: t1, 2: t2, 3: t3 };
                callback(null, {
                    id,
                    branch_id: 1,
                    status: 'EN_COCINA',
                    created_at: times[id],
                    updated_at: times[id]
                });
            });

            const results = await repository.findActive();

            expect(results).toHaveLength(3);
            expect(results[0].id).toBe(1); // oldest
            expect(results[1].id).toBe(2);
            expect(results[2].id).toBe(3); // newest
        });

        test('FIFO: single active order is returned correctly', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [{ id: 5 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow(5)]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 5,
                    branch_id: 1,
                    status: 'LISTO_PARA_SERVIR',
                    created_at: '2024-01-01 09:00:00',
                    updated_at: '2024-01-01 09:30:00'
                });
            });

            const results = await repository.findActive();

            expect(results).toHaveLength(1);
            expect(results[0].id).toBe(5);
        });

        test('FIFO: returns empty array when no active orders', async () => {
            mockDb.all.mockImplementation((sql, params, callback) => {
                callback(null, []);
            });

            const results = await repository.findActive();

            expect(results).toEqual([]);
        });
    });

    describe('findByStatus', () => {
        test('should return orders with specified status', async () => {
            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    expect(params).toContain('EN_COCINA');
                    callback(null, [{ id: 1 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow(params && params[0])]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                callback(null, {
                    id: 1,
                    branch_id: 1,
                    status: 'EN_COCINA',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            });

            const results = await repository.findByStatus('EN_COCINA');

            expect(Array.isArray(results)).toBe(true);
        });

        test('FIFO: should query orders by created_at ASC (oldest first)', async () => {
            let capturedSql = '';
            mockDb.all.mockImplementation((sql, params, callback) => {
                capturedSql = sql;
                callback(null, []);
            });

            await repository.findByStatus('EN_COCINA');

            expect(capturedSql).toMatch(/ORDER BY created_at ASC/i);
        });

        test('FIFO: should return orders in creation order for a given status', async () => {
            const t1 = '2024-01-01 07:00:00';
            const t2 = '2024-01-01 07:15:00';

            mockDb.all
                .mockImplementationOnce((sql, params, callback) => {
                    callback(null, [{ id: 10 }, { id: 20 }]);
                })
                .mockImplementation((sql, params, callback) => {
                    callback(null, [itemRow()]);
                });

            mockDb.get.mockImplementation((sql, params, callback) => {
                const id = params[0];
                const times = { 10: t1, 20: t2 };
                callback(null, {
                    id,
                    branch_id: 1,
                    status: 'EN_COCINA',
                    created_at: times[id] || t1,
                    updated_at: times[id] || t1
                });
            });

            const results = await repository.findByStatus('EN_COCINA');

            expect(results).toHaveLength(2);
            expect(results[0].id).toBe(10); // arrived first
            expect(results[1].id).toBe(20); // arrived second
        });
    });

    describe('update', () => {
        const validOrder = new Order({
            id: 1,
            branchId: 1,
            status: OrderStatus.LISTO_PARA_SERVIR,
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
                    status: 'LISTO_PARA_SERVIR',
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

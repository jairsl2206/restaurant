const OrderController = require('../../../src/interface-adapters/controllers/OrderController');
const Order = require('../../../src/domain/entities/Order');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');

describe('OrderController', () => {
    let controller;
    let mockCreateOrderUseCase;
    let mockGetOrdersUseCase;
    let mockGetOrderByIdUseCase;
    let mockUpdateOrderItemsUseCase;
    let mockUpdateOrderStatusUseCase;

    let req;
    let res;
    let next;

    beforeEach(() => {
        mockCreateOrderUseCase = { execute: jest.fn() };
        mockGetOrdersUseCase = { execute: jest.fn() };
        mockGetOrderByIdUseCase = { execute: jest.fn() };
        mockUpdateOrderItemsUseCase = { execute: jest.fn() };
        mockUpdateOrderStatusUseCase = { execute: jest.fn() };

        controller = new OrderController({
            createOrderUseCase: mockCreateOrderUseCase,
            getOrdersUseCase: mockGetOrdersUseCase,
            getOrderByIdUseCase: mockGetOrderByIdUseCase,
            updateOrderItemsUseCase: mockUpdateOrderItemsUseCase,
            updateOrderStatusUseCase: mockUpdateOrderStatusUseCase
        });

        req = {
            body: {},
            query: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        next = jest.fn();
    });

    describe('createOrder', () => {
        beforeEach(() => {
            req.body = {
                tableNumber: 5,
                items: [
                    { name: 'Pizza', quantity: 2, price: 150 }
                ]
            };
        });

        test('should create order and return 201 status', async () => {
            const mockOrder = {
                toJSON: () => ({
                    id: 1,
                    status: 'CREADA',
                    items: [{ itemName: 'Pizza', quantity: 2, unitPrice: 150 }]
                })
            };
            mockCreateOrderUseCase.execute.mockResolvedValue(mockOrder);

            await controller.createOrder(req, res, next);

            expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith({
                tableNumber: 5,
                items: req.body.items
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(mockOrder.toJSON());
        });

        test('should handle missing tableNumber', async () => {
            req.body = { items: [{ name: 'Item', quantity: 1, price: 100 }] };
            const mockOrder = {
                toJSON: () => ({ id: 1, status: 'CREADA' })
            };
            mockCreateOrderUseCase.execute.mockResolvedValue(mockOrder);

            await controller.createOrder(req, res, next);

            expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith({
                tableNumber: undefined,
                items: req.body.items
            });
        });

        test('should pass errors to next middleware', async () => {
            const error = new Error('Validation failed');
            mockCreateOrderUseCase.execute.mockRejectedValue(error);

            await controller.createOrder(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
            expect(res.status).not.toHaveBeenCalled();
        });
    });

    describe('getOrders', () => {
        test('should return active orders by default', async () => {
            const mockOrders = [
                { toJSON: () => ({ id: 1, status: 'CREADA' }) },
                { toJSON: () => ({ id: 2, status: 'PREPARANDO' }) }
            ];
            mockGetOrdersUseCase.execute.mockResolvedValue(mockOrders);

            await controller.getOrders(req, res, next);

            expect(mockGetOrdersUseCase.execute).toHaveBeenCalledWith({ filter: 'active' });
            expect(res.json).toHaveBeenCalledWith([
                { id: 1, status: 'CREADA' },
                { id: 2, status: 'PREPARANDO' }
            ]);
        });

        test('should filter by query parameter', async () => {
            req.query = { filter: 'all' };
            const mockOrders = [{ toJSON: () => ({ id: 1 }) }];
            mockGetOrdersUseCase.execute.mockResolvedValue(mockOrders);

            await controller.getOrders(req, res, next);

            expect(mockGetOrdersUseCase.execute).toHaveBeenCalledWith({ filter: 'all' });
        });

        test('should pass errors to next middleware', async () => {
            const error = new Error('Database error');
            mockGetOrdersUseCase.execute.mockRejectedValue(error);

            await controller.getOrders(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        test('should handle empty orders list', async () => {
            mockGetOrdersUseCase.execute.mockResolvedValue([]);

            await controller.getOrders(req, res, next);

            expect(res.json).toHaveBeenCalledWith([]);
        });
    });

    describe('getAllOrders', () => {
        test('should return all orders', async () => {
            const mockOrders = [
                { toJSON: () => ({ id: 1 }) },
                { toJSON: () => ({ id: 2 }) }
            ];
            mockGetOrdersUseCase.execute.mockResolvedValue(mockOrders);

            await controller.getAllOrders(req, res, next);

            expect(mockGetOrdersUseCase.execute).toHaveBeenCalledWith({ filter: 'all' });
            expect(res.json).toHaveBeenCalledWith([
                { id: 1 },
                { id: 2 }
            ]);
        });

        test('should pass errors to next middleware', async () => {
            const error = new Error('Database error');
            mockGetOrdersUseCase.execute.mockRejectedValue(error);

            await controller.getAllOrders(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getOrderById', () => {
        test('should return order by id', async () => {
            req.params = { id: '1' };
            const mockOrder = {
                toJSON: () => ({ id: 1, status: 'CREADA' })
            };
            mockGetOrderByIdUseCase.execute.mockResolvedValue(mockOrder);

            await controller.getOrderById(req, res, next);

            expect(mockGetOrderByIdUseCase.execute).toHaveBeenCalledWith(1);
            expect(res.json).toHaveBeenCalledWith(mockOrder.toJSON());
        });

        test('should parse id as integer', async () => {
            req.params = { id: '123' };
            const mockOrder = { toJSON: () => ({ id: 123 }) };
            mockGetOrderByIdUseCase.execute.mockResolvedValue(mockOrder);

            await controller.getOrderById(req, res, next);

            expect(mockGetOrderByIdUseCase.execute).toHaveBeenCalledWith(123);
        });

        test('should pass errors to next middleware', async () => {
            req.params = { id: '1' };
            const error = new Error('Order not found');
            mockGetOrderByIdUseCase.execute.mockRejectedValue(error);

            await controller.getOrderById(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('updateOrderItems', () => {
        beforeEach(() => {
            req.params = { id: '1' };
            req.body = {
                items: [
                    { menuItemId: 10, name: 'Pizza', quantity: 2, price: 150 }
                ]
            };
        });

        test('should update order items', async () => {
            const mockOrder = {
                toJSON: () => ({
                    id: 1,
                    items: [{ itemName: 'Pizza', quantity: 2 }]
                })
            };
            mockUpdateOrderItemsUseCase.execute.mockResolvedValue(mockOrder);

            await controller.updateOrderItems(req, res, next);

            expect(mockUpdateOrderItemsUseCase.execute).toHaveBeenCalledWith({
                orderId: 1,
                items: req.body.items
            });
            expect(res.json).toHaveBeenCalledWith(mockOrder.toJSON());
        });

        test('should parse id as integer', async () => {
            req.params = { id: '456' };
            const mockOrder = { toJSON: () => ({ id: 456 }) };
            mockUpdateOrderItemsUseCase.execute.mockResolvedValue(mockOrder);

            await controller.updateOrderItems(req, res, next);

            expect(mockUpdateOrderItemsUseCase.execute).toHaveBeenCalledWith({
                orderId: 456,
                items: req.body.items
            });
        });

        test('should pass errors to next middleware', async () => {
            const error = new Error('Cannot edit order');
            mockUpdateOrderItemsUseCase.execute.mockRejectedValue(error);

            await controller.updateOrderItems(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('updateOrderStatus', () => {
        beforeEach(() => {
            req.params = { id: '1' };
            req.body = { status: 'PREPARANDO' };
        });

        test('should update order status', async () => {
            const mockOrder = {
                toJSON: () => ({ id: 1, status: 'PREPARANDO' })
            };
            mockUpdateOrderStatusUseCase.execute.mockResolvedValue(mockOrder);

            await controller.updateOrderStatus(req, res, next);

            expect(mockUpdateOrderStatusUseCase.execute).toHaveBeenCalledWith({
                orderId: 1,
                status: 'PREPARANDO'
            });
            expect(res.json).toHaveBeenCalledWith(mockOrder.toJSON());
        });

        test('should handle different status values', async () => {
            req.body = { status: 'LISTA' };
            const mockOrder = { toJSON: () => ({ id: 1, status: 'LISTA' }) };
            mockUpdateOrderStatusUseCase.execute.mockResolvedValue(mockOrder);

            await controller.updateOrderStatus(req, res, next);

            expect(mockUpdateOrderStatusUseCase.execute).toHaveBeenCalledWith({
                orderId: 1,
                status: 'LISTA'
            });
        });

        test('should pass errors to next middleware', async () => {
            const error = new Error('Invalid status transition');
            mockUpdateOrderStatusUseCase.execute.mockRejectedValue(error);

            await controller.updateOrderStatus(req, res, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});

const UpdateOrderItems = require('../../../src/use-cases/orders/UpdateOrderItems');
const Order = require('../../../src/domain/entities/Order');
const OrderItem = require('../../../src/domain/entities/OrderItem');
const { NotFoundError, ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('UpdateOrderItems Use Case', () => {
    let mockOrderRepository;
    let updateOrderItems;

    beforeEach(() => {
        mockOrderRepository = {
            findById: jest.fn(),
            update: jest.fn()
        };
        updateOrderItems = new UpdateOrderItems(mockOrderRepository);
    });

    const createMockOrder = (status = 'EN_COCINA') => new Order({
        id: 1,
        branchId: 1,
        status,
        items: [
            { id: 1, itemName: 'Old Item 1', quantity: 1, unitPrice: 100 },
            { id: 2, itemName: 'Old Item 2', quantity: 2, unitPrice: 50 }
        ]
    });

    describe('execute with valid input', () => {
        test('should update items when order is in CREADA status', async () => {
            const order = createMockOrder('EN_COCINA');
            const newItems = [
                { menuItemId: 10, name: 'New Item', quantity: 1, price: 150 }
            ];
            const updatedOrder = { ...order };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderItems.execute({ orderId: 1, items: newItems });

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(1);
            expect(mockOrderRepository.update).toHaveBeenCalled();
            expect(result).toBe(updatedOrder);
        });

        test('should create OrderItem objects from input', async () => {
            const order = createMockOrder('EN_COCINA');
            const newItems = [
                { menuItemId: 10, name: 'Pizza', quantity: 2, price: 150 },
                { menuItemId: 20, name: 'Drink', quantity: 1, price: 50 }
            ];

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderItems.execute({ orderId: 1, items: newItems });

            const savedOrder = mockOrderRepository.update.mock.calls[0][0];
            expect(savedOrder.items).toHaveLength(2);
            expect(savedOrder.items[0]).toBeInstanceOf(OrderItem);
            expect(savedOrder.items[0].itemName).toBe('Pizza');
            expect(savedOrder.items[0].quantity).toBe(2);
            expect(savedOrder.items[0].menuItemId).toBe(10);
        });

        test('should set orderId on new items', async () => {
            const order = createMockOrder('EN_COCINA');
            const newItems = [{ name: 'Item', quantity: 1, price: 100 }];

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderItems.execute({ orderId: 1, items: newItems });

            const savedOrder = mockOrderRepository.update.mock.calls[0][0];
            expect(savedOrder.items[0].orderId).toBe(1);
        });
    });

    describe('execute in all active states (editable before payment)', () => {
        const activeStatuses = ['LISTO_PARA_SERVIR', 'SERVIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER'];

        activeStatuses.forEach(status => {
            test(`should allow editing when order is ${status}`, async () => {
                const order = createMockOrder(status);
                const newItems = [{ name: 'New Item', quantity: 1, price: 150 }];

                mockOrderRepository.findById.mockResolvedValue(order);
                mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

                const result = await updateOrderItems.execute({ orderId: 1, items: newItems });

                expect(mockOrderRepository.update).toHaveBeenCalled();
                expect(result.items[0].itemName).toBe('New Item');
            });
        });
    });

    describe('execute when order cannot be edited', () => {
        test('should throw ValidationError when order is FINALIZADO (cobrada)', async () => {
            const order = createMockOrder('FINALIZADO');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow('Cannot edit a finalized order');
        });
    });

    describe('execute with non-existent order', () => {
        test('should throw NotFoundError when order does not exist', async () => {
            mockOrderRepository.findById.mockResolvedValue(null);

            await expect(updateOrderItems.execute({
                orderId: 999,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow(NotFoundError);
            await expect(updateOrderItems.execute({
                orderId: 999,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow('Order with ID 999 not found');
        });
    });

    describe('input validation', () => {
        test('should throw ValidationError when input is null', async () => {
            await expect(updateOrderItems.execute(null))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute(null))
                .rejects.toThrow('Input is required');
        });

        test('should throw ValidationError when input is undefined', async () => {
            await expect(updateOrderItems.execute(undefined))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when orderId is missing', async () => {
            await expect(updateOrderItems.execute({
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow('Order ID is required');
        });

        test('should throw ValidationError when items is missing', async () => {
            await expect(updateOrderItems.execute({ orderId: 1 }))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({ orderId: 1 }))
                .rejects.toThrow('Order must have at least one item');
        });

        test('should throw ValidationError when items is empty array', async () => {
            await expect(updateOrderItems.execute({ orderId: 1, items: [] }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when items is not an array', async () => {
            await expect(updateOrderItems.execute({ orderId: 1, items: 'not array' }))
                .rejects.toThrow(ValidationError);
        });
    });

    describe('item validation', () => {
        test('should throw ValidationError when item name is missing', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ quantity: 1, price: 100 }]
            })).rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ quantity: 1, price: 100 }]
            })).rejects.toThrow('Item 1: name is required');
        });

        test('should throw ValidationError when item name is empty', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: '', quantity: 1, price: 100 }]
            })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item name is not a string', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 123, quantity: 1, price: 100 }]
            })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when quantity is zero', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 0, price: 100 }]
            })).rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 0, price: 100 }]
            })).rejects.toThrow('Item 1: quantity must be a positive integer');
        });

        test('should throw ValidationError when quantity is negative', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: -1, price: 100 }]
            })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when quantity is decimal', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1.5, price: 100 }]
            })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when quantity is not a number', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: '2', price: 100 }]
            })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when price is negative', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: -10 }]
            })).rejects.toThrow(ValidationError);
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: -10 }]
            })).rejects.toThrow('Item 1: price must be a non-negative number');
        });

        test('should throw ValidationError when price is not a number', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: '100' }]
            })).rejects.toThrow(ValidationError);
        });

        test('should validate all items and report first error', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [
                    { name: 'Valid', quantity: 1, price: 100 },
                    { name: '', quantity: 1, price: 100 },
                    { quantity: 2, price: 50 }
                ]
            })).rejects.toThrow('Item 2: name is required');
        });

        test('should validate third item with error', async () => {
            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [
                    { name: 'Valid 1', quantity: 1, price: 100 },
                    { name: 'Valid 2', quantity: 1, price: 100 },
                    { name: 'Invalid', quantity: 0, price: 100 }
                ]
            })).rejects.toThrow('Item 3: quantity must be a positive integer');
        });
    });

    describe('edge cases', () => {
        test('should allow zero price items', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Free Item', quantity: 1, price: 0 }]
            });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });

        test('should handle menuItemId as null when not provided', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            });

            const savedOrder = mockOrderRepository.update.mock.calls[0][0];
            expect(savedOrder.items[0].menuItemId).toBeNull();
        });
    });

    describe('repository error handling', () => {
        test('should propagate findById errors', async () => {
            mockOrderRepository.findById.mockRejectedValue(new Error('Database error'));

            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow('Database error');
        });

        test('should propagate update errors', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockRejectedValue(new Error('Update failed'));

            await expect(updateOrderItems.execute({
                orderId: 1,
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            })).rejects.toThrow('Update failed');
        });
    });
});

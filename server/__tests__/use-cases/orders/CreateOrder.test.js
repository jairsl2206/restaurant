const CreateOrder = require('../../../src/use-cases/orders/CreateOrder');
const Order = require('../../../src/domain/entities/Order');
const OrderItem = require('../../../src/domain/entities/OrderItem');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('CreateOrder Use Case', () => {
    let mockOrderRepository;
    let createOrder;

    beforeEach(() => {
        mockOrderRepository = {
            save: jest.fn()
        };
        createOrder = new CreateOrder(mockOrderRepository);
    });

    describe('execute', () => {
        const validInput = {
            branchId: 2,
            customerId: 100,
            waiterId: 50,
            tableNumber: 5,
            type: 'DELIVERY',
            notes: 'Extra cheese',
            items: [
                { menuItemId: 10, name: 'Pizza', quantity: 2, price: 150 },
                { menuItemId: 20, name: 'Drink', quantity: 1, price: 50 }
            ]
        };

        test('should create and save order with valid input', async () => {
            const savedOrder = { id: 1, toJSON: () => ({ id: 1 }) };
            mockOrderRepository.save.mockResolvedValue(savedOrder);

            const result = await createOrder.execute(validInput);

            expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
            expect(mockOrderRepository.save).toHaveBeenCalledWith(expect.any(Order));
            expect(result).toBe(savedOrder);
        });

        test('should set default branchId to 1', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.branchId).toBe(1);
        });

        test('should set default type to DINE_IN', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.type).toBe('DINE_IN');
        });

        test('should set status to CREADA', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.status.value).toBe(OrderStatus.CREADA);
        });

        test('should create OrderItem objects from input', async () => {
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(validInput);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.items).toHaveLength(2);
            expect(savedOrder.items[0]).toBeInstanceOf(OrderItem);
            expect(savedOrder.items[0].itemName).toBe('Pizza');
            expect(savedOrder.items[0].quantity).toBe(2);
        });

        test('should set menuItemId on order items', async () => {
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(validInput);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.items[0].menuItemId).toBe(10);
            expect(savedOrder.items[1].menuItemId).toBe(20);
        });

        test('should handle optional fields being null', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: 100 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.customerId).toBeNull();
            expect(savedOrder.waiterId).toBeNull();
            expect(savedOrder.tableNumber).toBeNull();
            expect(savedOrder.notes).toBeNull();
        });
    });

    describe('validation', () => {
        test('should throw ValidationError when input is null', async () => {
            await expect(createOrder.execute(null)).rejects.toThrow(ValidationError);
            await expect(createOrder.execute(null)).rejects.toThrow('Input is required');
        });

        test('should throw ValidationError when input is undefined', async () => {
            await expect(createOrder.execute(undefined)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when items is missing', async () => {
            await expect(createOrder.execute({})).rejects.toThrow(ValidationError);
            await expect(createOrder.execute({})).rejects.toThrow('Order must have at least one item');
        });

        test('should throw ValidationError when items is empty array', async () => {
            await expect(createOrder.execute({ items: [] })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when items is not an array', async () => {
            await expect(createOrder.execute({ items: 'not an array' })).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item name is missing', async () => {
            const input = {
                items: [{ quantity: 1, price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
            await expect(createOrder.execute(input)).rejects.toThrow('Item 1: name is required');
        });

        test('should throw ValidationError when item name is not a string', async () => {
            const input = {
                items: [{ name: 123, quantity: 1, price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item quantity is not positive integer', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 0, price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
            await expect(createOrder.execute(input)).rejects.toThrow('Item 1: quantity must be a positive integer');
        });

        test('should throw ValidationError when item quantity is negative', async () => {
            const input = {
                items: [{ name: 'Item', quantity: -1, price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item quantity is decimal', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1.5, price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item quantity is not a number', async () => {
            const input = {
                items: [{ name: 'Item', quantity: '2', price: 100 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when item price is negative', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: -10 }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
            await expect(createOrder.execute(input)).rejects.toThrow('Item 1: price must be a non-negative number');
        });

        test('should throw ValidationError when item price is not a number', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: '100' }]
            };
            await expect(createOrder.execute(input)).rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for second item with invalid data', async () => {
            const input = {
                items: [
                    { name: 'Valid Item', quantity: 1, price: 100 },
                    { name: '', quantity: 1, price: 100 }
                ]
            };
            await expect(createOrder.execute(input)).rejects.toThrow('Item 2: name is required');
        });
    });

    describe('edge cases', () => {
        test('should allow zero price items', async () => {
            const input = {
                items: [{ name: 'Free Item', quantity: 1, price: 0 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            expect(mockOrderRepository.save).toHaveBeenCalled();
        });

        test('should allow large quantities', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 999, price: 100 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            const savedOrder = mockOrderRepository.save.mock.calls[0][0];
            expect(savedOrder.items[0].quantity).toBe(999);
        });

        test('should handle decimal prices', async () => {
            const input = {
                items: [{ name: 'Item', quantity: 1, price: 99.99 }]
            };
            mockOrderRepository.save.mockImplementation(order => Promise.resolve(order));

            await createOrder.execute(input);

            expect(mockOrderRepository.save).toHaveBeenCalled();
        });
    });
});

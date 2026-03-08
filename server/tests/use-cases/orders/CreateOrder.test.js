const { CreateOrder } = require('../../../src/use-cases/orders');
const Order = require('../../../src/domain/entities/Order');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('CreateOrder Use Case', () => {
    let mockOrderRepository;
    let createOrderUseCase;

    beforeEach(() => {
        mockOrderRepository = {
            save: jest.fn(order => Promise.resolve({ ...order, id: 999 }))
        };
        createOrderUseCase = new CreateOrder(mockOrderRepository);
    });

    test('should create an order successfully with valid data', async () => {
        const orderData = {
            tableNumber: 5,
            items: [
                { name: 'Taco', quantity: 2, price: 25 },
                { name: 'Soda', quantity: 1, price: 20 }
            ]
        };

        const result = await createOrderUseCase.execute(orderData);

        expect(result.id).toBe(999);
        expect(result.tableNumber).toBe(5);
        expect(result.items).toHaveLength(2);
        expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
        expect(mockOrderRepository.save).toHaveBeenCalledWith(expect.any(Order));
    });

    test('should throw ValidationError if no items provided', async () => {
        const orderData = { tableNumber: 5, items: [] };

        await expect(createOrderUseCase.execute(orderData))
            .rejects.toThrow('Order must have at least one item');

        expect(mockOrderRepository.save).not.toHaveBeenCalled();
    });

    test('should handle delivery orders with customer info', async () => {
        const orderData = {
            items: [{ name: 'Pizza', quantity: 1, price: 150 }],
            orderType: 'delivery',
            customerName: 'Juan Perez',
            customerId: 10
        };

        const result = await createOrderUseCase.execute(orderData);

        expect(result.orderType).toBe('delivery');
        expect(result.customerName).toBe('Juan Perez');
    });
});

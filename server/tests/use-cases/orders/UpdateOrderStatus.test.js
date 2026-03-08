const UpdateOrderStatus = require('../../../src/use-cases/orders/UpdateOrderStatus');
const Order = require('../../../src/domain/entities/Order');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { NotFoundError, ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('UpdateOrderStatus Use Case', () => {
    let mockOrderRepository;
    let updateOrderStatusUseCase;

    beforeEach(() => {
        mockOrderRepository = {
            findById: jest.fn(),
            update: jest.fn(order => Promise.resolve(order))
        };
        updateOrderStatusUseCase = new UpdateOrderStatus(mockOrderRepository);
    });

    test('should update status successfully from Creado to En Cocina', async () => {
        const existingOrder = new Order({
            id: 1,
            tableNumber: 5,
            status: OrderStatus.CREATED,
            items: [{ itemName: 'Tacos', quantity: 2, price: 50 }]
        });

        mockOrderRepository.findById.mockResolvedValue(existingOrder);

        const result = await updateOrderStatusUseCase.execute({
            orderId: 1,
            status: OrderStatus.IN_KITCHEN
        });

        expect(result.status.value).toBe(OrderStatus.IN_KITCHEN);
        expect(mockOrderRepository.update).toHaveBeenCalled();
    });

    test('should throw NotFoundError if order does not exist', async () => {
        mockOrderRepository.findById.mockResolvedValue(null);

        await expect(updateOrderStatusUseCase.execute({ orderId: 999, status: 'En Cocina' }))
            .rejects.toThrow(NotFoundError);
    });

    test('should throw ValidationError for invalid transition', async () => {
        const existingOrder = new Order({
            id: 1,
            tableNumber: 5,
            status: OrderStatus.PAID, // Terminal state
            items: [{ itemName: 'Tacos', quantity: 2, price: 50 }]
        });

        mockOrderRepository.findById.mockResolvedValue(existingOrder);

        await expect(updateOrderStatusUseCase.execute({ orderId: 1, status: 'En Cocina' }))
            .rejects.toThrow('Cannot transition from');
    });

    test('should acknowledge update when status is "Listo para Servir"', async () => {
        const existingOrder = new Order({
            id: 1,
            tableNumber: 5,
            status: OrderStatus.IN_KITCHEN,
            isUpdated: true, // Marked as updated
            items: [{ itemName: 'Tacos', quantity: 2, price: 50 }]
        });

        mockOrderRepository.findById.mockResolvedValue(existingOrder);

        const result = await updateOrderStatusUseCase.execute({
            orderId: 1,
            status: OrderStatus.READY_TO_SERVE
        });

        expect(result.status.value).toBe(OrderStatus.READY_TO_SERVE);
        expect(result.isUpdated).toBe(false); // Successfully acknowledged
    });
});

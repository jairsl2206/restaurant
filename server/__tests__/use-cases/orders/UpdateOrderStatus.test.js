const UpdateOrderStatus = require('../../../src/use-cases/orders/UpdateOrderStatus');
const Order = require('../../../src/domain/entities/Order');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { NotFoundError, ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('UpdateOrderStatus Use Case', () => {
    let mockOrderRepository;
    let updateOrderStatus;

    beforeEach(() => {
        mockOrderRepository = {
            findById: jest.fn(),
            update: jest.fn()
        };
        updateOrderStatus = new UpdateOrderStatus(mockOrderRepository);
    });

    const createMockOrder = (status = 'CREADA') => new Order({
        id: 1,
        branchId: 1,
        status,
        items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }]
    });

    describe('execute with valid transition', () => {
        test('should update status from CREADA to PREPARANDO', async () => {
            const order = createMockOrder('CREADA');
            const updatedOrder = { ...order, status: new OrderStatus('PREPARANDO') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'PREPARANDO' });

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(1);
            expect(mockOrderRepository.update).toHaveBeenCalled();
            expect(result).toBe(updatedOrder);
        });

        test('should update status from PREPARANDO to LISTA', async () => {
            const order = createMockOrder('PREPARANDO');
            const updatedOrder = { ...order, status: new OrderStatus('LISTA') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'LISTA' });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });

        test('should update status from LISTA to ENTREGADA', async () => {
            const order = createMockOrder('LISTA');
            const updatedOrder = { ...order, status: new OrderStatus('ENTREGADA') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'ENTREGADA' });

            expect(result.status.value).toBe('ENTREGADA');
        });

        test('should update status to CANCELADA from any active state', async () => {
            const order = createMockOrder('CREADA');
            const updatedOrder = { ...order, status: new OrderStatus('CANCELADA') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'CANCELADA' });

            expect(result.status.value).toBe('CANCELADA');
        });
    });

    describe('execute with invalid transition', () => {
        test('should throw ValidationError for invalid transition CREADA to ENTREGADA', async () => {
            const order = createMockOrder('CREADA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'ENTREGADA' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition CREADA to LISTA', async () => {
            const order = createMockOrder('CREADA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'LISTA' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition PREPARANDO to ENTREGADA', async () => {
            const order = createMockOrder('PREPARANDO');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'ENTREGADA' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition ENTREGADA to any state', async () => {
            const order = createMockOrder('ENTREGADA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'CREADA' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition CANCELADA to any state', async () => {
            const order = createMockOrder('CANCELADA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'CREADA' }))
                .rejects.toThrow(ValidationError);
        });
    });

    describe('execute with non-existent order', () => {
        test('should throw NotFoundError when order does not exist', async () => {
            mockOrderRepository.findById.mockResolvedValue(null);

            await expect(updateOrderStatus.execute({ orderId: 999, status: 'PREPARANDO' }))
                .rejects.toThrow(NotFoundError);
            await expect(updateOrderStatus.execute({ orderId: 999, status: 'PREPARANDO' }))
                .rejects.toThrow('Order with ID 999 not found');
        });
    });

    describe('input validation', () => {
        test('should throw ValidationError when input is null', async () => {
            await expect(updateOrderStatus.execute(null))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderStatus.execute(null))
                .rejects.toThrow('Input is required');
        });

        test('should throw ValidationError when input is undefined', async () => {
            await expect(updateOrderStatus.execute(undefined))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError when orderId is missing', async () => {
            await expect(updateOrderStatus.execute({ status: 'PREPARANDO' }))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderStatus.execute({ status: 'PREPARANDO' }))
                .rejects.toThrow('Order ID is required');
        });

        test('should throw ValidationError when status is missing', async () => {
            await expect(updateOrderStatus.execute({ orderId: 1 }))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderStatus.execute({ orderId: 1 }))
                .rejects.toThrow('Status is required');
        });

        test('should throw ValidationError when both are missing', async () => {
            await expect(updateOrderStatus.execute({}))
                .rejects.toThrow(ValidationError);
        });
    });

    describe('invalid status values', () => {
        test('should throw ValidationError for invalid status string', async () => {
            const order = createMockOrder('CREADA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'INVALID' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for empty status', async () => {
            await expect(updateOrderStatus.execute({ orderId: 1, status: '' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for null status', async () => {
            await expect(updateOrderStatus.execute({ orderId: 1, status: null }))
                .rejects.toThrow(ValidationError);
        });
    });

    describe('repository error handling', () => {
        test('should propagate findById errors', async () => {
            mockOrderRepository.findById.mockRejectedValue(new Error('Database error'));

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'PREPARANDO' }))
                .rejects.toThrow('Database error');
        });

        test('should propagate update errors', async () => {
            const order = createMockOrder('CREADA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockRejectedValue(new Error('Update failed'));

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'PREPARANDO' }))
                .rejects.toThrow('Update failed');
        });
    });

    describe('status object handling', () => {
        test('should accept OrderStatus object', async () => {
            const order = createMockOrder('CREADA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderStatus.execute({ orderId: 1, status: new OrderStatus('PREPARANDO') });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });
    });
});

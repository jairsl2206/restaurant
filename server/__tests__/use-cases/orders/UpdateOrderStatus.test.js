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

    const createMockOrder = (status = 'EN_COCINA') => new Order({
        id: 1,
        branchId: 1,
        status,
        items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }]
    });

    describe('execute with valid transition', () => {
        test('should update status from EN_COCINA to LISTO_PARA_SERVIR', async () => {
            const order = createMockOrder('EN_COCINA');
            const updatedOrder = { ...order, status: new OrderStatus('LISTO_PARA_SERVIR') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'LISTO_PARA_SERVIR' });

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(1);
            expect(mockOrderRepository.update).toHaveBeenCalled();
            expect(result).toBe(updatedOrder);
        });

        test('should update status from EN_COCINA to EN_REPARTO (delivery)', async () => {
            const order = createMockOrder('EN_COCINA');
            const updatedOrder = { ...order, status: new OrderStatus('EN_REPARTO') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            await updateOrderStatus.execute({ orderId: 1, status: 'EN_REPARTO' });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });

        test('should update status from EN_COCINA to LISTO_PARA_RECOGER (pickup)', async () => {
            const order = createMockOrder('EN_COCINA');
            const updatedOrder = { ...order, status: new OrderStatus('LISTO_PARA_RECOGER') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            await updateOrderStatus.execute({ orderId: 1, status: 'LISTO_PARA_RECOGER' });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });

        test('should update status from LISTO_PARA_SERVIR to SERVIDO', async () => {
            const order = createMockOrder('LISTO_PARA_SERVIR');
            const updatedOrder = { ...order, status: new OrderStatus('SERVIDO') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            await updateOrderStatus.execute({ orderId: 1, status: 'SERVIDO' });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });

        test('should update status from SERVIDO to FINALIZADO', async () => {
            const order = createMockOrder('SERVIDO');
            const updatedOrder = { ...order, status: new OrderStatus('FINALIZADO') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'FINALIZADO' });

            expect(result.status.value).toBe('FINALIZADO');
        });

        test('should update status from EN_REPARTO to FINALIZADO', async () => {
            const order = createMockOrder('EN_REPARTO');
            const updatedOrder = { ...order, status: new OrderStatus('FINALIZADO') };

            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockResolvedValue(updatedOrder);

            const result = await updateOrderStatus.execute({ orderId: 1, status: 'FINALIZADO' });

            expect(result.status.value).toBe('FINALIZADO');
        });
    });

    describe('execute with invalid transition', () => {
        test('should throw ValidationError for invalid transition EN_COCINA to FINALIZADO', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'FINALIZADO' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition EN_COCINA to SERVIDO', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'SERVIDO' }))
                .rejects.toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid transition FINALIZADO to any state', async () => {
            const order = createMockOrder('FINALIZADO');
            mockOrderRepository.findById.mockResolvedValue(order);

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'EN_COCINA' }))
                .rejects.toThrow(ValidationError);
        });
    });

    describe('execute with non-existent order', () => {
        test('should throw NotFoundError when order does not exist', async () => {
            mockOrderRepository.findById.mockResolvedValue(null);

            await expect(updateOrderStatus.execute({ orderId: 999, status: 'LISTO_PARA_SERVIR' }))
                .rejects.toThrow(NotFoundError);
            await expect(updateOrderStatus.execute({ orderId: 999, status: 'LISTO_PARA_SERVIR' }))
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
            await expect(updateOrderStatus.execute({ status: 'LISTO_PARA_SERVIR' }))
                .rejects.toThrow(ValidationError);
            await expect(updateOrderStatus.execute({ status: 'LISTO_PARA_SERVIR' }))
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
            const order = createMockOrder('EN_COCINA');
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

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'LISTO_PARA_SERVIR' }))
                .rejects.toThrow('Database error');
        });

        test('should propagate update errors', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockRejectedValue(new Error('Update failed'));

            await expect(updateOrderStatus.execute({ orderId: 1, status: 'LISTO_PARA_SERVIR' }))
                .rejects.toThrow('Update failed');
        });
    });

    describe('status object handling', () => {
        test('should accept OrderStatus object', async () => {
            const order = createMockOrder('EN_COCINA');
            mockOrderRepository.findById.mockResolvedValue(order);
            mockOrderRepository.update.mockImplementation(o => Promise.resolve(o));

            await updateOrderStatus.execute({ orderId: 1, status: new OrderStatus('LISTO_PARA_SERVIR') });

            expect(mockOrderRepository.update).toHaveBeenCalled();
        });
    });
});

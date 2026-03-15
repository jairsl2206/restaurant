const GetOrderById = require('../../../src/use-cases/orders/GetOrderById');
const Order = require('../../../src/domain/entities/Order');
const { NotFoundError } = require('../../../src/shared/errors/errorTypes');

describe('GetOrderById Use Case', () => {
    let mockOrderRepository;
    let getOrderById;

    beforeEach(() => {
        mockOrderRepository = {
            findById: jest.fn()
        };
        getOrderById = new GetOrderById(mockOrderRepository);
    });

    describe('execute with valid id', () => {
        test('should return order when found', async () => {
            const mockOrder = new Order({
                id: 1,
                branchId: 1,
                status: 'CREADA',
                items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }]
            });
            mockOrderRepository.findById.mockResolvedValue(mockOrder);

            const result = await getOrderById.execute(1);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(1);
            expect(result).toBe(mockOrder);
        });

        test('should return order for different id', async () => {
            const mockOrder = new Order({
                id: 99,
                branchId: 1,
                status: 'CREADA',
                items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }]
            });
            mockOrderRepository.findById.mockResolvedValue(mockOrder);

            const result = await getOrderById.execute(99);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(99);
            expect(result.id).toBe(99);
        });
    });

    describe('execute with non-existent order', () => {
        test('should throw NotFoundError when order does not exist', async () => {
            mockOrderRepository.findById.mockResolvedValue(null);

            await expect(getOrderById.execute(999)).rejects.toThrow(NotFoundError);
            await expect(getOrderById.execute(999)).rejects.toThrow('Order with ID 999 not found');
        });

        test('should include order id in error message', async () => {
            mockOrderRepository.findById.mockResolvedValue(null);

            try {
                await getOrderById.execute(123);
            } catch (error) {
                expect(error.message).toContain('123');
            }
        });
    });

    describe('execute with invalid id', () => {
        test('should throw NotFoundError for null id', async () => {
            await expect(getOrderById.execute(null)).rejects.toThrow(NotFoundError);
            await expect(getOrderById.execute(null)).rejects.toThrow('Invalid order ID');
        });

        test('should throw NotFoundError for undefined id', async () => {
            await expect(getOrderById.execute(undefined)).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for string id', async () => {
            await expect(getOrderById.execute('abc')).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for decimal number', async () => {
            await expect(getOrderById.execute(1.5)).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for zero', async () => {
            await expect(getOrderById.execute(0)).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for negative number', async () => {
            await expect(getOrderById.execute(-1)).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for object', async () => {
            await expect(getOrderById.execute({ id: 1 })).rejects.toThrow(NotFoundError);
        });

        test('should throw NotFoundError for array', async () => {
            await expect(getOrderById.execute([1])).rejects.toThrow(NotFoundError);
        });
    });

    describe('execute with valid integer ids', () => {
        test('should accept positive integer id', async () => {
            mockOrderRepository.findById.mockResolvedValue({ id: 1 });

            await getOrderById.execute(1);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(1);
        });

        test('should accept large integer id', async () => {
            mockOrderRepository.findById.mockResolvedValue({ id: 999999 });

            await getOrderById.execute(999999);

            expect(mockOrderRepository.findById).toHaveBeenCalledWith(999999);
        });
    });

    describe('repository error handling', () => {
        test('should propagate database errors', async () => {
            const dbError = new Error('Database connection lost');
            mockOrderRepository.findById.mockRejectedValue(dbError);

            await expect(getOrderById.execute(1)).rejects.toThrow('Database connection lost');
        });

        test('should propagate custom errors', async () => {
            const customError = new Error('Custom repository error');
            mockOrderRepository.findById.mockRejectedValue(customError);

            await expect(getOrderById.execute(1)).rejects.toThrow('Custom repository error');
        });
    });
});

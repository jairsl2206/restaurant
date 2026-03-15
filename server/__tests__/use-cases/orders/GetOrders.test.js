const GetOrders = require('../../../src/use-cases/orders/GetOrders');

describe('GetOrders Use Case', () => {
    let mockOrderRepository;
    let getOrders;

    beforeEach(() => {
        mockOrderRepository = {
            findAll: jest.fn(),
            findActive: jest.fn(),
            findByStatus: jest.fn()
        };
        getOrders = new GetOrders(mockOrderRepository);
    });

    describe('execute with no filter (default active)', () => {
        test('should return active orders by default', async () => {
            const activeOrders = [{ id: 1 }, { id: 2 }];
            mockOrderRepository.findActive.mockResolvedValue(activeOrders);

            const result = await getOrders.execute();

            expect(mockOrderRepository.findActive).toHaveBeenCalledTimes(1);
            expect(result).toBe(activeOrders);
        });

        test('should return active orders when filter is "active"', async () => {
            const activeOrders = [{ id: 1 }];
            mockOrderRepository.findActive.mockResolvedValue(activeOrders);

            const result = await getOrders.execute({ filter: 'active' });

            expect(mockOrderRepository.findActive).toHaveBeenCalledTimes(1);
            expect(result).toBe(activeOrders);
        });

        test('should return empty array when no active orders', async () => {
            mockOrderRepository.findActive.mockResolvedValue([]);

            const result = await getOrders.execute();

            expect(result).toEqual([]);
        });
    });

    describe('execute with filter "all"', () => {
        test('should return all orders', async () => {
            const allOrders = [{ id: 1 }, { id: 2 }, { id: 3 }];
            mockOrderRepository.findAll.mockResolvedValue(allOrders);

            const result = await getOrders.execute({ filter: 'all' });

            expect(mockOrderRepository.findAll).toHaveBeenCalledTimes(1);
            expect(mockOrderRepository.findActive).not.toHaveBeenCalled();
            expect(result).toBe(allOrders);
        });

        test('should handle empty orders list', async () => {
            mockOrderRepository.findAll.mockResolvedValue([]);

            const result = await getOrders.execute({ filter: 'all' });

            expect(result).toEqual([]);
        });
    });

    describe('execute with status filter', () => {
        test('should return orders by status CREADA', async () => {
            const orders = [{ id: 1, status: 'CREADA' }];
            mockOrderRepository.findByStatus.mockResolvedValue(orders);

            const result = await getOrders.execute({ filter: 'CREADA' });

            expect(mockOrderRepository.findByStatus).toHaveBeenCalledWith('CREADA');
            expect(result).toBe(orders);
        });

        test('should return orders by status PREPARANDO', async () => {
            const orders = [{ id: 1, status: 'PREPARANDO' }];
            mockOrderRepository.findByStatus.mockResolvedValue(orders);

            const result = await getOrders.execute({ filter: 'PREPARANDO' });

            expect(mockOrderRepository.findByStatus).toHaveBeenCalledWith('PREPARANDO');
        });

        test('should return orders by status LISTA', async () => {
            const orders = [{ id: 1, status: 'LISTA' }];
            mockOrderRepository.findByStatus.mockResolvedValue(orders);

            const result = await getOrders.execute({ filter: 'LISTA' });

            expect(mockOrderRepository.findByStatus).toHaveBeenCalledWith('LISTA');
        });

        test('should handle custom status filter', async () => {
            mockOrderRepository.findByStatus.mockResolvedValue([]);

            await getOrders.execute({ filter: 'ENTREGADA' });

            expect(mockOrderRepository.findByStatus).toHaveBeenCalledWith('ENTREGADA');
        });
    });

    describe('execute with empty input', () => {
        test('should handle empty object', async () => {
            const activeOrders = [{ id: 1 }];
            mockOrderRepository.findActive.mockResolvedValue(activeOrders);

            const result = await getOrders.execute({});

            expect(mockOrderRepository.findActive).toHaveBeenCalledTimes(1);
            expect(result).toBe(activeOrders);
        });

        test('should handle undefined filter', async () => {
            const activeOrders = [{ id: 1 }];
            mockOrderRepository.findActive.mockResolvedValue(activeOrders);

            const result = await getOrders.execute({ filter: undefined });

            expect(mockOrderRepository.findActive).toHaveBeenCalledTimes(1);
        });
    });

    describe('error handling', () => {
        test('should propagate repository errors for findActive', async () => {
            const error = new Error('Database connection failed');
            mockOrderRepository.findActive.mockRejectedValue(error);

            await expect(getOrders.execute()).rejects.toThrow('Database connection failed');
        });

        test('should propagate repository errors for findAll', async () => {
            const error = new Error('Database timeout');
            mockOrderRepository.findAll.mockRejectedValue(error);

            await expect(getOrders.execute({ filter: 'all' })).rejects.toThrow('Database timeout');
        });

        test('should propagate repository errors for findByStatus', async () => {
            const error = new Error('Invalid status');
            mockOrderRepository.findByStatus.mockRejectedValue(error);

            await expect(getOrders.execute({ filter: 'CREADA' })).rejects.toThrow('Invalid status');
        });
    });

    describe('repository method selection', () => {
        test('should call only the appropriate repository method', async () => {
            mockOrderRepository.findActive.mockResolvedValue([]);

            await getOrders.execute();

            expect(mockOrderRepository.findActive).toHaveBeenCalledTimes(1);
            expect(mockOrderRepository.findAll).not.toHaveBeenCalled();
            expect(mockOrderRepository.findByStatus).not.toHaveBeenCalled();
        });
    });
});

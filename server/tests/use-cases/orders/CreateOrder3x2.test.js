const CreateOrder = require('../../../src/use-cases/orders/CreateOrder');
const Order = require('../../../src/domain/entities/Order');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const CategoryPromotion = require('../../../src/domain/entities/CategoryPromotion');

describe('CreateOrder with 3x2 Promotions Integration', () => {
    let mockOrderRepo;
    let mockMenuRepo;
    let mockPromoRepo;
    let createOrderUseCase;

    beforeEach(() => {
        mockOrderRepo = {
            save: jest.fn(order => Promise.resolve(order))
        };
        mockMenuRepo = {
            findAll: jest.fn(() => Promise.resolve([
                { name: 'Taco Pastor', category: 'Tacos', price: 20 },
                { name: 'Taco Bistec', category: 'Tacos', price: 25 },
                { name: 'Taco Lengua', category: 'Tacos', price: 30 },
                { name: 'Coca Cola', category: 'Bebidas', price: 25 }
            ]))
        };
        mockPromoRepo = {
            findActive: jest.fn(() => Promise.resolve([
                new CategoryPromotion({ category: 'Tacos', promotionType: '3x2', active: true })
            ]))
        };

        createOrderUseCase = new CreateOrder(mockOrderRepo, mockMenuRepo, mockPromoRepo);
    });

    test('should create order and apply 3x2 promotion automatically', async () => {
        const input = {
            tableNumber: 5,
            items: [
                { name: 'Taco Pastor', quantity: 1, price: 20 },
                { name: 'Taco Bistec', quantity: 1, price: 25 },
                { name: 'Taco Lengua', quantity: 1, price: 30 }
            ],
            orderType: 'dine-in'
        };

        const result = await createOrderUseCase.execute(input);

        expect(result).toBeInstanceOf(Order);
        // Total should be 30 + 25 + 0 = 55 (Taco Pastor at 20 is the cheapest and should be free)
        expect(result.total.amount).toBe(55);
        expect(mockOrderRepo.save).toHaveBeenCalled();

        // Check if categories were assigned
        expect(result.items[0].category).toBe('Tacos');
        expect(result.items[1].category).toBe('Tacos');
        expect(result.items[2].category).toBe('Tacos');
    });

    test('should handle items without promotions correctly', async () => {
        const input = {
            tableNumber: 5,
            items: [
                { name: 'Taco Pastor', quantity: 1, price: 20 },
                { name: 'Coca Cola', quantity: 1, price: 25 }
            ],
            orderType: 'dine-in'
        };

        const result = await createOrderUseCase.execute(input);

        // 20 + 25 = 45
        expect(result.total.amount).toBe(45);
    });
});

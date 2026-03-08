const Order = require('../../../src/domain/entities/Order');
const OrderItem = require('../../../src/domain/entities/OrderItem');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const CategoryPromotion = require('../../../src/domain/entities/CategoryPromotion');

describe('Order 3x2 Promotion Logic', () => {
    const burritoPromo = new CategoryPromotion({
        category: 'Burritos',
        promotionType: '3x2',
        active: true
    });

    const tacoPromo = new CategoryPromotion({
        category: 'Tacos',
        promotionType: '3x2',
        active: true
    });

    test('should apply 3x2 when 3 items of same category and same price are ordered', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Burrito 1', quantity: 3, price: 100, category: 'Burritos' })
            ],
            categoryPromotions: [burritoPromo]
        });

        // Total should be 200 (buy 3, pay 2)
        expect(order.total.amount).toBe(200);
    });

    test('should apply 3x2 and discount the cheapest item when prices vary', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Burrito Caro', quantity: 1, price: 150, category: 'Burritos' }),
                new OrderItem({ itemName: 'Burrito Medio', quantity: 1, price: 100, category: 'Burritos' }),
                new OrderItem({ itemName: 'Burrito Barato', quantity: 1, price: 50, category: 'Burritos' })
            ],
            categoryPromotions: [burritoPromo]
        });

        // Total should be 150 + 100 + 0 = 250
        expect(order.total.amount).toBe(250);
    });

    test('should handle 4 items (3x2 applies once, 4th item full price)', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Taco', quantity: 4, price: 20, category: 'Tacos' })
            ],
            categoryPromotions: [tacoPromo]
        });

        // Total should be (20 * 2) + 20 = 60
        expect(order.total.amount).toBe(60);
    });

    test('should handle 6 items (3x2 applies twice)', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Taco', quantity: 6, price: 20, category: 'Tacos' })
            ],
            categoryPromotions: [tacoPromo]
        });

        // Total should be 20 * 4 = 80
        expect(order.total.amount).toBe(80);
    });

    test('should handle multiple categories with promotions independenty', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Burrito', quantity: 3, price: 100, category: 'Burritos' }),
                new OrderItem({ itemName: 'Taco', quantity: 3, price: 50, category: 'Tacos' })
            ],
            categoryPromotions: [burritoPromo, tacoPromo]
        });

        // (100 * 2) + (50 * 2) = 300
        expect(order.total.amount).toBe(300);
    });

    test('should not apply 3x2 if promotion is inactive', () => {
        const inactivePromo = new CategoryPromotion({
            category: 'Burritos',
            promotionType: '3x2',
            active: false
        });

        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'Burrito', quantity: 3, price: 100, category: 'Burritos' })
            ],
            categoryPromotions: [inactivePromo]
        });

        expect(order.total.amount).toBe(300);
    });

    test('should handle complex mixed quantity and price scenario', () => {
        const order = new Order({
            tableNumber: 1,
            status: OrderStatus.CREATED,
            items: [
                new OrderItem({ itemName: 'B1', quantity: 2, price: 100, category: 'Burritos' }),
                new OrderItem({ itemName: 'B2', quantity: 2, price: 50, category: 'Burritos' })
            ],
            categoryPromotions: [burritoPromo]
        });

        // Total prices: 100, 100, 50, 50
        // Group 1 (sorted): 100, 100, 50 -> 50 is free. Remaining: 50.
        // Total: 100 + 100 + 0 + 50 = 250
        expect(order.total.amount).toBe(250);
    });
});

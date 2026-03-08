const MenuItem = require('../../../src/domain/entities/MenuItem');
const Money = require('../../../src/domain/value-objects/Money');

describe('MenuItem Entity', () => {
    const defaultItemData = {
        id: 1,
        name: 'Tacos Al Pastor',
        price: 100,
        category: 'Tacos',
        isAvailable: true
    };

    test('should calculate correct final price without promotion', () => {
        const item = new MenuItem(defaultItemData);
        expect(item.getFinalPrice()).toBe(100);
    });

    test('should calculate percentage discount correctly', () => {
        const item = new MenuItem({
            ...defaultItemData,
            promotionActive: true,
            promotionType: 'percentage',
            promotionValue: 20
        });
        expect(item.getFinalPrice()).toBe(80);
    });

    test('should calculate fixed discount correctly', () => {
        const item = new MenuItem({
            ...defaultItemData,
            promotionActive: true,
            promotionType: 'fixed',
            promotionValue: 15
        });
        expect(item.getFinalPrice()).toBe(85);
    });

    test('should return 0 if fixed discount is greater than price', () => {
        const item = new MenuItem({
            ...defaultItemData,
            promotionActive: true,
            promotionType: 'fixed',
            promotionValue: 150
        });
        expect(item.getFinalPrice()).toBe(0);
    });

    test('should ignore promotion if not active', () => {
        const item = new MenuItem({
            ...defaultItemData,
            promotionActive: false,
            promotionType: 'percentage',
            promotionValue: 50
        });
        expect(item.getFinalPrice()).toBe(100);
    });

    test('toPlain should include finalPrice', () => {
        const item = new MenuItem(defaultItemData);
        const plain = item.toPlain();
        expect(plain).toHaveProperty('finalPrice', 100);
        expect(plain).toHaveProperty('price', 100);
    });
});

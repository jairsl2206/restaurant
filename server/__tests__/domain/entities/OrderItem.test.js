const OrderItem = require('../../../src/domain/entities/OrderItem');
const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('OrderItem Entity', () => {
    const validItemData = {
        id: 1,
        orderId: 100,
        menuItemId: 50,
        itemName: 'Pizza Margherita',
        quantity: 2,
        unitPrice: 150.00,
        discountAmount: 10
    };

    describe('constructor', () => {
        test('should create OrderItem with valid data', () => {
            const item = new OrderItem(validItemData);
            expect(item.id).toBe(1);
            expect(item.orderId).toBe(100);
            expect(item.menuItemId).toBe(50);
            expect(item.itemName).toBe('Pizza Margherita');
            expect(item.quantity).toBe(2);
            expect(item.discountAmount).toBe(10);
        });

        test('should convert unitPrice to Money object', () => {
            const item = new OrderItem(validItemData);
            expect(item.unitPrice).toBeInstanceOf(Money);
            expect(item.unitPrice.amount).toBe(150.00);
        });

        test('should accept Money object as unitPrice', () => {
            const data = {
                ...validItemData,
                unitPrice: new Money(200)
            };
            const item = new OrderItem(data);
            expect(item.unitPrice).toBeInstanceOf(Money);
            expect(item.unitPrice.amount).toBe(200);
        });

        test('should use default values for optional fields', () => {
            const data = {
                itemName: 'Burger',
                quantity: 1,
                unitPrice: 100
            };
            const item = new OrderItem(data);
            expect(item.id).toBeUndefined();
            expect(item.orderId).toBeUndefined();
            expect(item.menuItemId).toBeNull();
            expect(item.discountAmount).toBe(0);
        });

        test('should throw ValidationError for empty itemName', () => {
            expect(() => new OrderItem({ ...validItemData, itemName: '' }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for whitespace-only itemName', () => {
            expect(() => new OrderItem({ ...validItemData, itemName: '   ' }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for null itemName', () => {
            expect(() => new OrderItem({ ...validItemData, itemName: null }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for undefined itemName', () => {
            expect(() => new OrderItem({ ...validItemData, itemName: undefined }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for non-string itemName', () => {
            expect(() => new OrderItem({ ...validItemData, itemName: 123 }))
                .toThrow(ValidationError);
            expect(() => new OrderItem({ ...validItemData, itemName: {} }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for zero quantity', () => {
            expect(() => new OrderItem({ ...validItemData, quantity: 0 }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for negative quantity', () => {
            expect(() => new OrderItem({ ...validItemData, quantity: -1 }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for non-integer quantity', () => {
            expect(() => new OrderItem({ ...validItemData, quantity: 1.5 }))
                .toThrow(ValidationError);
            expect(() => new OrderItem({ ...validItemData, quantity: '2' }))
                .toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid unitPrice', () => {
            expect(() => new OrderItem({ ...validItemData, unitPrice: null }))
                .toThrow(ValidationError);
            expect(() => new OrderItem({ ...validItemData, unitPrice: undefined }))
                .toThrow(ValidationError);
            expect(() => new OrderItem({ ...validItemData, unitPrice: '100' }))
                .toThrow(ValidationError);
        });
    });

    describe('grossTotal', () => {
        test('should calculate gross total correctly', () => {
            const item = new OrderItem({
                itemName: 'Burger',
                quantity: 3,
                unitPrice: 100
            });
            expect(item.grossTotal).toBeInstanceOf(Money);
            expect(item.grossTotal.amount).toBe(300);
        });

        test('should calculate gross total with quantity 1', () => {
            const item = new OrderItem({
                itemName: 'Drink',
                quantity: 1,
                unitPrice: 50
            });
            expect(item.grossTotal.amount).toBe(50);
        });

        test('should handle zero price', () => {
            const item = new OrderItem({
                itemName: 'Free Item',
                quantity: 5,
                unitPrice: 0
            });
            expect(item.grossTotal.amount).toBe(0);
        });
    });

    describe('subtotal', () => {
        test('should calculate subtotal after discount', () => {
            const item = new OrderItem({
                itemName: 'Pizza',
                quantity: 2,
                unitPrice: 100,
                discountAmount: 50
            });
            // gross: 200, discount: 50 = subtotal: 150
            expect(item.subtotal).toBeInstanceOf(Money);
            expect(item.subtotal.amount).toBe(150);
        });

        test('should return zero when discount exceeds gross total', () => {
            const item = new OrderItem({
                itemName: 'Item',
                quantity: 1,
                unitPrice: 100,
                discountAmount: 150
            });
            expect(item.subtotal.amount).toBe(0);
        });

        test('should return gross total when no discount', () => {
            const item = new OrderItem({
                itemName: 'Item',
                quantity: 2,
                unitPrice: 100
            });
            expect(item.subtotal.amount).toBe(200);
        });

        test('should handle zero discount', () => {
            const item = new OrderItem({
                itemName: 'Item',
                quantity: 2,
                unitPrice: 100,
                discountAmount: 0
            });
            expect(item.subtotal.amount).toBe(200);
        });
    });

    describe('price getter', () => {
        test('should return unitPrice as alias for price', () => {
            const item = new OrderItem(validItemData);
            expect(item.price).toBe(item.unitPrice);
        });
    });

    describe('updateQuantity', () => {
        test('should return new OrderItem with updated quantity', () => {
            const item = new OrderItem(validItemData);
            const updated = item.updateQuantity(5);
            expect(updated.quantity).toBe(5);
            expect(updated).toBeInstanceOf(OrderItem);
        });

        test('should preserve other properties', () => {
            const item = new OrderItem(validItemData);
            const updated = item.updateQuantity(5);
            expect(updated.id).toBe(item.id);
            expect(updated.orderId).toBe(item.orderId);
            expect(updated.itemName).toBe(item.itemName);
            expect(updated.unitPrice).toEqual(item.unitPrice);
        });

        test('should return new instance (immutable)', () => {
            const item = new OrderItem(validItemData);
            const updated = item.updateQuantity(5);
            expect(updated).not.toBe(item);
            expect(item.quantity).toBe(2);
        });

        test('should throw ValidationError for invalid quantity', () => {
            const item = new OrderItem(validItemData);
            expect(() => item.updateQuantity(0)).toThrow(ValidationError);
            expect(() => item.updateQuantity(-1)).toThrow(ValidationError);
            expect(() => item.updateQuantity(1.5)).toThrow(ValidationError);
        });
    });

    describe('equals', () => {
        test('should return true for items with same name and price', () => {
            const item1 = new OrderItem({ itemName: 'Burger', quantity: 2, unitPrice: 100 });
            const item2 = new OrderItem({ itemName: 'Burger', quantity: 1, unitPrice: 100 });
            expect(item1.equals(item2)).toBe(true);
        });

        test('should return false for different names', () => {
            const item1 = new OrderItem({ itemName: 'Burger', quantity: 1, unitPrice: 100 });
            const item2 = new OrderItem({ itemName: 'Pizza', quantity: 1, unitPrice: 100 });
            expect(item1.equals(item2)).toBe(false);
        });

        test('should return false for different prices', () => {
            const item1 = new OrderItem({ itemName: 'Burger', quantity: 1, unitPrice: 100 });
            const item2 = new OrderItem({ itemName: 'Burger', quantity: 1, unitPrice: 150 });
            expect(item1.equals(item2)).toBe(false);
        });

        test('should return false for non-OrderItem', () => {
            const item = new OrderItem(validItemData);
            expect(item.equals({ itemName: 'Pizza', unitPrice: new Money(150) })).toBe(false);
        });
    });

    describe('toJSON', () => {
        test('should return serialized object', () => {
            const item = new OrderItem(validItemData);
            const json = item.toJSON();
            expect(json).toEqual({
                id: 1,
                orderId: 100,
                menuItemId: 50,
                itemName: 'Pizza Margherita',
                quantity: 2,
                unitPrice: 150,
                discountAmount: 10,
                subtotal: 290
            });
        });

        test('should serialize unitPrice as number', () => {
            const item = new OrderItem(validItemData);
            const json = item.toJSON();
            expect(typeof json.unitPrice).toBe('number');
        });

        test('should serialize subtotal as number', () => {
            const item = new OrderItem(validItemData);
            const json = item.toJSON();
            expect(typeof json.subtotal).toBe('number');
        });
    });
});

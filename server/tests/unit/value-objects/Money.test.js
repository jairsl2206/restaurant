const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('Money Value Object', () => {
    test('should create a valid Money instance', () => {
        const price = new Money(150.5);
        expect(price.amount).toBe(150.5);
        expect(price.currency).toBe('MXN');
    });

    test('should throw ValidationError for negative amount', () => {
        expect(() => new Money(-10)).toThrow(ValidationError);
    });

    test('should return formatted string', () => {
        const price = new Money(50);
        expect(price.toString()).toBe('MXN 50.00');
    });

    test('should add another Money instance', () => {
        const m1 = new Money(100);
        const m2 = new Money(50);
        const result = m1.add(m2);
        expect(result.amount).toBe(150);
    });

    test('should throw error when adding different currencies', () => {
        const m1 = new Money(100, 'MXN');
        const m2 = new Money(50, 'USD');
        expect(() => m1.add(m2)).toThrow('Cannot add money with different currencies');
    });
});

const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('Money Value Object', () => {
    describe('constructor', () => {
        test('should create Money with valid amount and default currency', () => {
            const money = new Money(100);
            expect(money.amount).toBe(100);
            expect(money.currency).toBe('MXN');
        });

        test('should create Money with valid amount and custom currency', () => {
            const money = new Money(50.5, 'USD');
            expect(money.amount).toBe(50.5);
            expect(money.currency).toBe('USD');
        });

        test('should round amount to 2 decimal places', () => {
            const money = new Money(100.999);
            expect(money.amount).toBe(101);
        });

        test('should throw ValidationError for negative amount', () => {
            expect(() => new Money(-10)).toThrow(ValidationError);
            expect(() => new Money(-10)).toThrow('Amount must be a non-negative number');
        });

        test('should throw ValidationError for non-number amount', () => {
            expect(() => new Money('100')).toThrow(ValidationError);
            expect(() => new Money(null)).toThrow(ValidationError);
            expect(() => new Money(undefined)).toThrow(ValidationError);
            expect(() => new Money({})).toThrow(ValidationError);
        });

        test('should allow zero amount', () => {
            const money = new Money(0);
            expect(money.amount).toBe(0);
            expect(money.isZero()).toBe(true);
        });

        test('should freeze the object', () => {
            const money = new Money(100);
            expect(Object.isFrozen(money)).toBe(true);
        });
    });

    describe('add', () => {
        test('should add two Money objects with same currency', () => {
            const money1 = new Money(100);
            const money2 = new Money(50);
            const result = money1.add(money2);
            expect(result.amount).toBe(150);
            expect(result.currency).toBe('MXN');
        });

        test('should throw ValidationError when adding different currencies', () => {
            const money1 = new Money(100, 'MXN');
            const money2 = new Money(50, 'USD');
            expect(() => money1.add(money2)).toThrow(ValidationError);
            expect(() => money1.add(money2)).toThrow('Cannot add money with different currencies');
        });

        test('should throw ValidationError when adding non-Money object', () => {
            const money = new Money(100);
            expect(() => money.add(50)).toThrow(ValidationError);
            expect(() => money.add('50')).toThrow(ValidationError);
            expect(() => money.add(null)).toThrow(ValidationError);
        });

        test('should return new Money instance (immutable)', () => {
            const money1 = new Money(100);
            const money2 = new Money(50);
            const result = money1.add(money2);
            expect(result).not.toBe(money1);
            expect(result).not.toBe(money2);
            expect(money1.amount).toBe(100);
            expect(money2.amount).toBe(50);
        });
    });

    describe('subtract', () => {
        test('should subtract two Money objects with same currency', () => {
            const money1 = new Money(100);
            const money2 = new Money(30);
            const result = money1.subtract(money2);
            expect(result.amount).toBe(70);
        });

        test('should throw ValidationError when result would be negative', () => {
            const money1 = new Money(30);
            const money2 = new Money(100);
            expect(() => money1.subtract(money2)).toThrow(ValidationError);
            expect(() => money1.subtract(money2)).toThrow('Result cannot be negative');
        });

        test('should throw ValidationError when subtracting different currencies', () => {
            const money1 = new Money(100, 'MXN');
            const money2 = new Money(50, 'USD');
            expect(() => money1.subtract(money2)).toThrow(ValidationError);
        });

        test('should throw ValidationError when subtracting non-Money object', () => {
            const money = new Money(100);
            expect(() => money.subtract(50)).toThrow(ValidationError);
        });

        test('should allow subtraction resulting in zero', () => {
            const money1 = new Money(100);
            const money2 = new Money(100);
            const result = money1.subtract(money2);
            expect(result.amount).toBe(0);
            expect(result.isZero()).toBe(true);
        });
    });

    describe('multiply', () => {
        test('should multiply Money by positive factor', () => {
            const money = new Money(50);
            const result = money.multiply(2);
            expect(result.amount).toBe(100);
        });

        test('should multiply Money by decimal factor', () => {
            const money = new Money(100);
            const result = money.multiply(0.5);
            expect(result.amount).toBe(50);
        });

        test('should throw ValidationError for negative factor', () => {
            const money = new Money(100);
            expect(() => money.multiply(-2)).toThrow(ValidationError);
        });

        test('should throw ValidationError for non-number factor', () => {
            const money = new Money(100);
            expect(() => money.multiply('2')).toThrow(ValidationError);
            expect(() => money.multiply(null)).toThrow(ValidationError);
        });

        test('should return same amount when multiplying by 1', () => {
            const money = new Money(100);
            const result = money.multiply(1);
            expect(result.amount).toBe(100);
        });

        test('should return zero when multiplying by 0', () => {
            const money = new Money(100);
            const result = money.multiply(0);
            expect(result.amount).toBe(0);
        });
    });

    describe('equals', () => {
        test('should return true for equal Money objects', () => {
            const money1 = new Money(100, 'MXN');
            const money2 = new Money(100, 'MXN');
            expect(money1.equals(money2)).toBe(true);
        });

        test('should return false for different amounts', () => {
            const money1 = new Money(100);
            const money2 = new Money(50);
            expect(money1.equals(money2)).toBe(false);
        });

        test('should return false for different currencies', () => {
            const money1 = new Money(100, 'MXN');
            const money2 = new Money(100, 'USD');
            expect(money1.equals(money2)).toBe(false);
        });

        test('should return false for non-Money object', () => {
            const money = new Money(100);
            expect(money.equals(100)).toBe(false);
            expect(money.equals({ amount: 100, currency: 'MXN' })).toBe(false);
        });
    });

    describe('isGreaterThan', () => {
        test('should return true when amount is greater', () => {
            const money1 = new Money(100);
            const money2 = new Money(50);
            expect(money1.isGreaterThan(money2)).toBe(true);
        });

        test('should return false when amount is equal', () => {
            const money1 = new Money(100);
            const money2 = new Money(100);
            expect(money1.isGreaterThan(money2)).toBe(false);
        });

        test('should return false when amount is less', () => {
            const money1 = new Money(50);
            const money2 = new Money(100);
            expect(money1.isGreaterThan(money2)).toBe(false);
        });

        test('should throw ValidationError for different currencies', () => {
            const money1 = new Money(100, 'MXN');
            const money2 = new Money(50, 'USD');
            expect(() => money1.isGreaterThan(money2)).toThrow(ValidationError);
        });

        test('should throw ValidationError for non-Money object', () => {
            const money = new Money(100);
            expect(() => money.isGreaterThan(50)).toThrow(ValidationError);
        });
    });

    describe('isZero', () => {
        test('should return true for zero amount', () => {
            const money = new Money(0);
            expect(money.isZero()).toBe(true);
        });

        test('should return false for non-zero amount', () => {
            const money = new Money(0.01);
            expect(money.isZero()).toBe(false);
        });
    });

    describe('toString', () => {
        test('should return formatted string with currency and amount', () => {
            const money = new Money(100.5);
            expect(money.toString()).toBe('MXN 100.50');
        });

        test('should handle zero correctly', () => {
            const money = new Money(0);
            expect(money.toString()).toBe('MXN 0.00');
        });
    });

    describe('toJSON', () => {
        test('should return amount as number', () => {
            const money = new Money(100.5);
            expect(money.toJSON()).toBe(100.5);
        });
    });
});

const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * Money Value Object
 * Represents monetary values with validation
 */
class Money {
    constructor(amount, currency = 'MXN') {
        if (typeof amount !== 'number' || amount < 0) {
            throw new ValidationError('Amount must be a non-negative number');
        }
        this._amount = Math.round(amount * 100) / 100; // Round to 2 decimals
        this._currency = currency;
        Object.freeze(this);
    }

    get amount() {
        return this._amount;
    }

    get currency() {
        return this._currency;
    }

    add(other) {
        if (!(other instanceof Money)) {
            throw new ValidationError('Can only add Money objects');
        }
        if (this._currency !== other._currency) {
            throw new ValidationError('Cannot add money with different currencies');
        }
        return new Money(this._amount + other._amount, this._currency);
    }

    subtract(other) {
        if (!(other instanceof Money)) {
            throw new ValidationError('Can only subtract Money objects');
        }
        if (this._currency !== other._currency) {
            throw new ValidationError('Cannot subtract money with different currencies');
        }
        const result = this._amount - other._amount;
        if (result < 0) {
            throw new ValidationError('Result cannot be negative');
        }
        return new Money(result, this._currency);
    }

    multiply(factor) {
        if (typeof factor !== 'number' || factor < 0) {
            throw new ValidationError('Factor must be a non-negative number');
        }
        return new Money(this._amount * factor, this._currency);
    }

    equals(other) {
        return other instanceof Money &&
            this._amount === other._amount &&
            this._currency === other._currency;
    }

    isGreaterThan(other) {
        if (!(other instanceof Money) || this._currency !== other._currency) {
            throw new ValidationError('Can only compare Money objects with same currency');
        }
        return this._amount > other._amount;
    }

    isZero() {
        return this._amount === 0;
    }

    toString() {
        return `${this._currency} ${this._amount.toFixed(2)}`;
    }

    toJSON() {
        return this._amount;
    }
}

module.exports = Money;

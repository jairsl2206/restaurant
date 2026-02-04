const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderStatus Value Object
 * Represents the status of an order with validation
 */
class OrderStatus {
    static CREATED = 'Creado';
    static IN_KITCHEN = 'En Cocina';
    static READY_TO_SERVE = 'Listo para Servir';
    static SERVED = 'Servido';
    static PAID = 'Pagado';

    static ALL_STATUSES = [
        OrderStatus.CREATED,
        OrderStatus.IN_KITCHEN,
        OrderStatus.READY_TO_SERVE,
        OrderStatus.SERVED,
        OrderStatus.PAID
    ];

    constructor(value) {
        if (!this.isValid(value)) {
            throw new ValidationError(`Invalid order status: ${value}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() {
        return this._value;
    }

    isValid(value) {
        return OrderStatus.ALL_STATUSES.includes(value);
    }

    isCreated() {
        return this._value === OrderStatus.CREATED;
    }

    isInKitchen() {
        return this._value === OrderStatus.IN_KITCHEN;
    }

    isReadyToServe() {
        return this._value === OrderStatus.READY_TO_SERVE;
    }

    isServed() {
        return this._value === OrderStatus.SERVED;
    }

    isPaid() {
        return this._value === OrderStatus.PAID;
    }

    canTransitionTo(newStatus) {
        const transitions = {
            [OrderStatus.CREATED]: [OrderStatus.IN_KITCHEN],
            [OrderStatus.IN_KITCHEN]: [OrderStatus.READY_TO_SERVE],
            [OrderStatus.READY_TO_SERVE]: [OrderStatus.SERVED],
            [OrderStatus.SERVED]: [OrderStatus.PAID],
            [OrderStatus.PAID]: []
        };

        return transitions[this._value]?.includes(newStatus) || false;
    }

    equals(other) {
        return other instanceof OrderStatus && this._value === other._value;
    }

    toString() {
        return this._value;
    }
}

module.exports = OrderStatus;

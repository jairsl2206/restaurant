const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderStatus Value Object
 * Single source of truth for all order statuses in the system.
 * Replaces the legacy constants.js file.
 */
class OrderStatus {
    // Dine-in flow
    static CREATED = 'Creado';
    static IN_KITCHEN = 'En Cocina';
    static READY_TO_SERVE = 'Listo para Servir';
    static SERVED = 'Servido';
    static PAID = 'Pagado';

    // Delivery flow
    static DELIVERING = 'En Reparto';

    // Pickup flow
    static PICKUP_READY = 'Listo para Pickup';
    static PICKUP_COMPLETED = 'Recogido por Cliente';

    // Terminal states
    static CANCELLED = 'Cancelado';

    static ALL_STATUSES = [
        OrderStatus.CREATED,
        OrderStatus.IN_KITCHEN,
        OrderStatus.READY_TO_SERVE,
        OrderStatus.SERVED,
        OrderStatus.PAID,
        OrderStatus.DELIVERING,
        OrderStatus.PICKUP_READY,
        OrderStatus.PICKUP_COMPLETED,
        OrderStatus.CANCELLED
    ];

    /** States that are considered "active" (not completed) */
    static ACTIVE_STATUSES = [
        OrderStatus.CREATED,
        OrderStatus.IN_KITCHEN,
        OrderStatus.READY_TO_SERVE,
        OrderStatus.SERVED,
        OrderStatus.DELIVERING,
        OrderStatus.PICKUP_READY
    ];

    /** Valid state machine transitions */
    static TRANSITIONS = {
        [OrderStatus.CREATED]: [OrderStatus.IN_KITCHEN, OrderStatus.CANCELLED, OrderStatus.PICKUP_READY],
        [OrderStatus.IN_KITCHEN]: [OrderStatus.READY_TO_SERVE, OrderStatus.DELIVERING, OrderStatus.CANCELLED],
        [OrderStatus.READY_TO_SERVE]: [OrderStatus.SERVED, OrderStatus.CANCELLED],
        [OrderStatus.SERVED]: [OrderStatus.PAID],
        [OrderStatus.DELIVERING]: [OrderStatus.PAID, OrderStatus.CANCELLED],
        [OrderStatus.PICKUP_READY]: [OrderStatus.PICKUP_COMPLETED, OrderStatus.CANCELLED],
        [OrderStatus.PICKUP_COMPLETED]: [OrderStatus.PAID],
        [OrderStatus.PAID]: [],
        [OrderStatus.CANCELLED]: []
    };

    constructor(value) {
        if (!OrderStatus.ALL_STATUSES.includes(value)) {
            throw new ValidationError(`Invalid order status: "${value}". Valid statuses: ${OrderStatus.ALL_STATUSES.join(', ')}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() {
        return this._value;
    }

    // State checks
    isCreated() { return this._value === OrderStatus.CREATED; }
    isInKitchen() { return this._value === OrderStatus.IN_KITCHEN; }
    isReadyToServe() { return this._value === OrderStatus.READY_TO_SERVE; }
    isServed() { return this._value === OrderStatus.SERVED; }
    isPaid() { return this._value === OrderStatus.PAID; }
    isDelivering() { return this._value === OrderStatus.DELIVERING; }
    isPickupReady() { return this._value === OrderStatus.PICKUP_READY; }
    isPickupCompleted() { return this._value === OrderStatus.PICKUP_COMPLETED; }
    isCancelled() { return this._value === OrderStatus.CANCELLED; }

    isActive() {
        return OrderStatus.ACTIVE_STATUSES.includes(this._value);
    }

    isTerminal() {
        return this._value === OrderStatus.PAID ||
            this._value === OrderStatus.CANCELLED;
    }

    canTransitionTo(newStatus) {
        const allowed = OrderStatus.TRANSITIONS[this._value] || [];
        return allowed.includes(newStatus);
    }

    equals(other) {
        return other instanceof OrderStatus && this._value === other._value;
    }

    toString() {
        return this._value;
    }
}

module.exports = OrderStatus;

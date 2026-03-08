const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderStatus Value Object
 * Maps to the order_status ENUM: CREADA | PREPARANDO | LISTA | ENTREGADA | CANCELADA
 */
class OrderStatus {
    static CREADA     = 'CREADA';
    static PREPARANDO = 'PREPARANDO';
    static LISTA      = 'LISTA';
    static ENTREGADA  = 'ENTREGADA';
    static CANCELADA  = 'CANCELADA';

    static ALL_STATUSES = [
        OrderStatus.CREADA,
        OrderStatus.PREPARANDO,
        OrderStatus.LISTA,
        OrderStatus.ENTREGADA,
        OrderStatus.CANCELADA
    ];

    // Allowed transitions — kitchen flow
    static TRANSITIONS = {
        [OrderStatus.CREADA]:     [OrderStatus.PREPARANDO, OrderStatus.CANCELADA],
        [OrderStatus.PREPARANDO]: [OrderStatus.LISTA,      OrderStatus.CANCELADA],
        [OrderStatus.LISTA]:      [OrderStatus.ENTREGADA,  OrderStatus.CANCELADA],
        [OrderStatus.ENTREGADA]:  [],
        [OrderStatus.CANCELADA]:  []
    };

    constructor(value) {
        if (!OrderStatus.ALL_STATUSES.includes(value)) {
            throw new ValidationError(`Invalid order status: "${value}". Valid: ${OrderStatus.ALL_STATUSES.join(', ')}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() { return this._value; }

    isCreada()     { return this._value === OrderStatus.CREADA;     }
    isPreparando() { return this._value === OrderStatus.PREPARANDO; }
    isLista()      { return this._value === OrderStatus.LISTA;      }
    isEntregada()  { return this._value === OrderStatus.ENTREGADA;  }
    isCancelada()  { return this._value === OrderStatus.CANCELADA;  }

    /** Is the order still "open" (not delivered or cancelled)? */
    isActive() {
        return this._value !== OrderStatus.ENTREGADA && this._value !== OrderStatus.CANCELADA;
    }

    canTransitionTo(newStatus) {
        return (OrderStatus.TRANSITIONS[this._value] || []).includes(newStatus);
    }

    equals(other) {
        return other instanceof OrderStatus && this._value === other._value;
    }

    toString() { return this._value; }
}

module.exports = OrderStatus;

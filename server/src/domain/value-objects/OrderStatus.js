const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderStatus Value Object
 * Maps to the order_status ENUM:
 *   EN_COCINA | LISTO_PARA_SERVIR | SERVIDO | EN_REPARTO | LISTO_PARA_RECOGER | FINALIZADO
 */
class OrderStatus {
    static EN_COCINA          = 'EN_COCINA';
    static LISTO_PARA_SERVIR  = 'LISTO_PARA_SERVIR';
    static SERVIDO            = 'SERVIDO';
    static EN_REPARTO         = 'EN_REPARTO';
    static LISTO_PARA_RECOGER = 'LISTO_PARA_RECOGER';
    static FINALIZADO         = 'FINALIZADO';

    static ALL_STATUSES = [
        OrderStatus.EN_COCINA,
        OrderStatus.LISTO_PARA_SERVIR,
        OrderStatus.SERVIDO,
        OrderStatus.EN_REPARTO,
        OrderStatus.LISTO_PARA_RECOGER,
        OrderStatus.FINALIZADO
    ];

    // Allowed transitions
    static TRANSITIONS = {
        [OrderStatus.EN_COCINA]:          [OrderStatus.LISTO_PARA_SERVIR, OrderStatus.EN_REPARTO, OrderStatus.LISTO_PARA_RECOGER],
        [OrderStatus.LISTO_PARA_SERVIR]:  [OrderStatus.SERVIDO, OrderStatus.FINALIZADO],
        [OrderStatus.SERVIDO]:            [OrderStatus.FINALIZADO],
        [OrderStatus.EN_REPARTO]:         [OrderStatus.FINALIZADO],
        [OrderStatus.LISTO_PARA_RECOGER]: [OrderStatus.FINALIZADO],
        [OrderStatus.FINALIZADO]:         []
    };

    constructor(value) {
        if (!OrderStatus.ALL_STATUSES.includes(value)) {
            throw new ValidationError(`Invalid order status: "${value}". Valid: ${OrderStatus.ALL_STATUSES.join(', ')}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() { return this._value; }

    isEnCocina()         { return this._value === OrderStatus.EN_COCINA;          }
    isListoParaServir()  { return this._value === OrderStatus.LISTO_PARA_SERVIR;  }
    isServido()          { return this._value === OrderStatus.SERVIDO;            }
    isEnReparto()        { return this._value === OrderStatus.EN_REPARTO;         }
    isListoParaRecoger() { return this._value === OrderStatus.LISTO_PARA_RECOGER; }
    isFinalizado()       { return this._value === OrderStatus.FINALIZADO;         }

    /** Is the order still open (not finalizado)? */
    isActive() {
        return this._value !== OrderStatus.FINALIZADO;
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

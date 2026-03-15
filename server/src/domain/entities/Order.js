const OrderStatus = require('../value-objects/OrderStatus');
const Money = require('../value-objects/Money');
const OrderItem = require('./OrderItem');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * Order Entity
 * Represents a restaurant order with business rules.
 * Aligned with the new schema: type (DINE_IN|DELIVERY|PICKUP),
 * subtotal / discount_total / tax_total / total, branchId, customerId, waiterId.
 */
class Order {
    constructor({
        id,
        branchId,
        customerId  = null,
        waiterId    = null,
        tableNumber = null,
        type        = 'DINE_IN',
        status,
        items       = [],
        subtotal    = 0,
        discountTotal = 0,
        taxTotal    = 0,
        notes       = null,
        createdAt,
        updatedAt
    }) {
        this._validateItems(items);

        this.id           = id;
        this.branchId     = branchId;
        this.customerId   = customerId;
        this.waiterId     = waiterId;
        this.tableNumber  = tableNumber;
        this.type         = type;
        this.status       = status instanceof OrderStatus ? status : new OrderStatus(status);
        this.items        = items.map(item => item instanceof OrderItem ? item : new OrderItem(item));
        this.discountTotal = discountTotal;
        this.taxTotal     = taxTotal;
        this.notes        = notes;
        this.createdAt    = createdAt || new Date();
        this.updatedAt    = updatedAt || new Date();
    }

    _validateItems(items) {
        if (!Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
    }

    // ── Totals ──────────────────────────────────────────────────────────────────

    get subtotal() {
        return this.items.reduce(
            (acc, item) => acc.add(item.subtotal),
            new Money(0)
        );
    }

    get total() {
        const base = this.subtotal.amount - this.discountTotal + this.taxTotal;
        return new Money(Math.max(0, base));
    }

    // ── Business Rules ──────────────────────────────────────────────────────────

    /** Items can be edited as long as the order has not been finalized (paid) */
    canBeEdited()      { return this.status.isActive(); }
    /** Order is ready to be served (dine-in) or picked up */
    canBeServed()      { return this.status.isListoParaServir(); }
    /** Order is ready to be finalized (paid) */
    canBeFinalizado()  {
        return this.status.isServido() || this.status.isEnReparto() || this.status.isListoParaRecoger() || this.status.isListoParaServir();
    }

    isDineIn()   { return this.type === 'DINE_IN';  }
    isDelivery() { return this.type === 'DELIVERY'; }
    isPickup()   { return this.type === 'PICKUP';   }

    // ── Actions ─────────────────────────────────────────────────────────────────

    updateStatus(newStatus) {
        const newStatusObj = newStatus instanceof OrderStatus ? newStatus : new OrderStatus(newStatus);
        if (!this.status.canTransitionTo(newStatusObj.value)) {
            throw new ValidationError(
                `Cannot transition from ${this.status.value} to ${newStatusObj.value}`
            );
        }
        return new Order({ ...this._data(), status: newStatusObj, updatedAt: new Date() });
    }

    updateItems(newItems) {
        if (!this.canBeEdited()) {
            throw new ValidationError('Cannot edit a finalized order');
        }
        return new Order({ ...this._data(), items: newItems, updatedAt: new Date() });
    }

    addItem(item) {
        const newItem = item instanceof OrderItem ? item : new OrderItem(item);
        return new Order({ ...this._data(), items: [...this.items, newItem], updatedAt: new Date() });
    }

    removeItem(itemId) {
        const filtered = this.items.filter(i => i.id !== itemId);
        if (filtered.length === 0) throw new ValidationError('Order must have at least one item');
        return new Order({ ...this._data(), items: filtered, updatedAt: new Date() });
    }

    // ── Serialization ───────────────────────────────────────────────────────────

    _data() {
        return {
            id:            this.id,
            branchId:      this.branchId,
            customerId:    this.customerId,
            waiterId:      this.waiterId,
            tableNumber:   this.tableNumber,
            type:          this.type,
            status:        this.status,
            items:         this.items,
            discountTotal: this.discountTotal,
            taxTotal:      this.taxTotal,
            notes:         this.notes,
            createdAt:     this.createdAt,
            updatedAt:     this.updatedAt
        };
    }

    toJSON() {
        return {
            id:            this.id,
            branchId:      this.branchId,
            customerId:    this.customerId,
            waiterId:      this.waiterId,
            tableNumber:   this.tableNumber,
            type:          this.type,
            status:        this.status.value,
            items:         this.items.map(i => i.toJSON()),
            subtotal:      this.subtotal.amount,
            discountTotal: this.discountTotal,
            taxTotal:      this.taxTotal,
            total:         this.total.amount,
            notes:         this.notes,
            createdAt:     this.createdAt,
            updatedAt:     this.updatedAt
        };
    }
}

module.exports = Order;

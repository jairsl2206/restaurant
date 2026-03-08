const Money = require('../value-objects/Money');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderItem Entity
 * Aligned with new schema: menu_item_id, unit_price, discount_amount, total_price.
 */
class OrderItem {
    constructor({ id, orderId, menuItemId = null, itemName, quantity, unitPrice, discountAmount = 0 }) {
        this._validate(itemName, quantity, unitPrice);

        this.id             = id;
        this.orderId        = orderId;
        this.menuItemId     = menuItemId;
        this.itemName       = itemName;
        this.quantity       = quantity;
        this.unitPrice      = unitPrice instanceof Money ? unitPrice : new Money(unitPrice);
        this.discountAmount = discountAmount;
    }

    _validate(itemName, quantity, unitPrice) {
        if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
            throw new ValidationError('Item name is required');
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new ValidationError('Quantity must be a positive integer');
        }
        if (typeof unitPrice !== 'number' && !(unitPrice instanceof Money)) {
            throw new ValidationError('Unit price must be a number or Money object');
        }
    }

    /** Gross line total before discounts */
    get grossTotal() {
        return this.unitPrice.multiply(this.quantity);
    }

    /** Net line total after discount */
    get subtotal() {
        return new Money(Math.max(0, this.grossTotal.amount - this.discountAmount));
    }

    /** Alias for compatibility */
    get price() { return this.unitPrice; }

    updateQuantity(newQuantity) {
        if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
            throw new ValidationError('Quantity must be a positive integer');
        }
        return new OrderItem({ ...this.toJSON(), quantity: newQuantity });
    }

    equals(other) {
        return other instanceof OrderItem &&
            this.itemName === other.itemName &&
            this.unitPrice.equals(other.unitPrice);
    }

    toJSON() {
        return {
            id:             this.id,
            orderId:        this.orderId,
            menuItemId:     this.menuItemId,
            itemName:       this.itemName,
            quantity:       this.quantity,
            unitPrice:      this.unitPrice.amount,
            discountAmount: this.discountAmount,
            subtotal:       this.subtotal.amount
        };
    }
}

module.exports = OrderItem;

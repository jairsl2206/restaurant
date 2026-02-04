const Money = require('../value-objects/Money');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * OrderItem Entity
 * Represents an item within an order
 */
class OrderItem {
    constructor({ id, orderId, itemName, quantity, price }) {
        this.validate(itemName, quantity, price);

        this.id = id;
        this.orderId = orderId;
        this.itemName = itemName;
        this.quantity = quantity;
        this.price = price instanceof Money ? price : new Money(price);
    }

    validate(itemName, quantity, price) {
        if (!itemName || typeof itemName !== 'string' || itemName.trim() === '') {
            throw new ValidationError('Item name is required');
        }
        if (!Number.isInteger(quantity) || quantity <= 0) {
            throw new ValidationError('Quantity must be a positive integer');
        }
        if (typeof price !== 'number' && !(price instanceof Money)) {
            throw new ValidationError('Price must be a number or Money object');
        }
    }

    get subtotal() {
        return this.price.multiply(this.quantity);
    }

    updateQuantity(newQuantity) {
        if (!Number.isInteger(newQuantity) || newQuantity <= 0) {
            throw new ValidationError('Quantity must be a positive integer');
        }
        return new OrderItem({
            id: this.id,
            orderId: this.orderId,
            itemName: this.itemName,
            quantity: newQuantity,
            price: this.price
        });
    }

    equals(other) {
        return other instanceof OrderItem &&
            this.itemName === other.itemName &&
            this.price.equals(other.price);
    }

    toJSON() {
        return {
            id: this.id,
            orderId: this.orderId,
            itemName: this.itemName,
            quantity: this.quantity,
            price: this.price.amount,
            subtotal: this.subtotal.amount
        };
    }
}

module.exports = OrderItem;

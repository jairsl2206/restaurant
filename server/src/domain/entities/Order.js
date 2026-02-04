const OrderStatus = require('../value-objects/OrderStatus');
const Money = require('../value-objects/Money');
const OrderItem = require('./OrderItem');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * Order Entity
 * Represents a restaurant order with business rules
 */
class Order {
    constructor({
        id,
        tableNumber,
        status,
        items = [],
        createdAt,
        updatedAt,
        isUpdated = false,
        originalItemsSnapshot = null
    }) {
        this.validate(tableNumber, items);

        this.id = id;
        this.tableNumber = tableNumber;
        this.status = status instanceof OrderStatus ? status : new OrderStatus(status);
        this.items = items.map(item => item instanceof OrderItem ? item : new OrderItem(item));
        this.createdAt = createdAt || new Date();
        this.updatedAt = updatedAt || new Date();
        this.isUpdated = isUpdated;
        this.originalItemsSnapshot = originalItemsSnapshot;
    }

    validate(tableNumber, items) {
        if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
            throw new ValidationError('Table number must be a positive integer');
        }
        if (!Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
    }

    // Business Rules

    canBeEdited() {
        return this.status.isCreated();
    }

    canBeMovedToKitchen() {
        return this.status.isCreated() && this.items.length > 0;
    }

    canBeMarkedAsReady() {
        return this.status.isInKitchen();
    }

    canBeServed() {
        return this.status.isReadyToServe();
    }

    canBePaid() {
        return this.status.isServed();
    }

    // Calculations

    calculateTotal() {
        return this.items.reduce(
            (total, item) => total.add(item.subtotal),
            new Money(0)
        );
    }

    get total() {
        return this.calculateTotal();
    }

    // Actions

    updateStatus(newStatus) {
        const newStatusObj = newStatus instanceof OrderStatus ? newStatus : new OrderStatus(newStatus);

        if (!this.status.canTransitionTo(newStatusObj.value)) {
            throw new ValidationError(
                `Cannot transition from ${this.status.value} to ${newStatusObj.value}`
            );
        }

        return new Order({
            ...this.toJSON(),
            status: newStatusObj,
            updatedAt: new Date()
        });
    }

    updateItems(newItems) {
        if (!this.canBeEdited()) {
            throw new ValidationError('Cannot edit order that is not in Created status');
        }

        // Save snapshot of original items if this is the first edit
        const originalSnapshot = !this.isUpdated && !this.originalItemsSnapshot
            ? this.items.map(item => item.toJSON())
            : this.originalItemsSnapshot;

        return new Order({
            ...this.toJSON(),
            items: newItems,
            isUpdated: true,
            originalItemsSnapshot: originalSnapshot,
            updatedAt: new Date()
        });
    }

    acknowledgeUpdate() {
        return new Order({
            ...this.toJSON(),
            isUpdated: false,
            originalItemsSnapshot: null,
            updatedAt: new Date()
        });
    }

    addItem(item) {
        const newItem = item instanceof OrderItem ? item : new OrderItem(item);
        return new Order({
            ...this.toJSON(),
            items: [...this.items, newItem],
            updatedAt: new Date()
        });
    }

    removeItem(itemId) {
        const filteredItems = this.items.filter(item => item.id !== itemId);
        if (filteredItems.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
        return new Order({
            ...this.toJSON(),
            items: filteredItems,
            updatedAt: new Date()
        });
    }

    // Serialization

    toJSON() {
        return {
            id: this.id,
            tableNumber: this.tableNumber,
            status: this.status.value,
            items: this.items.map(item => item.toJSON()),
            total: this.total.amount,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            isUpdated: this.isUpdated,
            originalItemsSnapshot: this.originalItemsSnapshot
        };
    }

    // For database compatibility (legacy format)
    toLegacyFormat() {
        return {
            id: this.id,
            table_number: this.tableNumber,
            status: this.status.value,
            total: this.total.amount,
            items: this.items.map(item => `${item.itemName} x${item.quantity}`).join(', '),
            created_at: this.createdAt,
            updated_at: this.updatedAt,
            is_updated: this.isUpdated ? 1 : 0,
            original_items_snapshot: this.originalItemsSnapshot
                ? JSON.stringify(this.originalItemsSnapshot)
                : null
        };
    }
}

module.exports = Order;

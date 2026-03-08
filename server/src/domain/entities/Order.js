const OrderStatus = require('../value-objects/OrderStatus');
const Money = require('../value-objects/Money');
const OrderItem = require('./OrderItem');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * Order Entity
 * Represents a restaurant order with all business rules.
 * Supports dine-in, pickup, and delivery order types.
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
        originalItemsSnapshot = null,
        // Customer info
        customerName = null,
        phone = null,
        address = null,
        notes = null,
        // Order type
        orderType = 'dine-in', // 'dine-in' | 'pickup' | 'delivery'
        categoryPromotions = [],
    }) {
        this.validate({ tableNumber, items, orderType, customerName, phone });

        this.id = id;
        this.tableNumber = tableNumber;
        this.status = status instanceof OrderStatus ? status : new OrderStatus(status);
        this.items = items.map(item => item instanceof OrderItem ? item : new OrderItem(item));
        this.categoryPromotions = categoryPromotions;
        this.createdAt = createdAt ? new Date(createdAt) : new Date();
        this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
        this.isUpdated = isUpdated;
        this.originalItemsSnapshot = originalItemsSnapshot;
        this.customerName = customerName;
        this.phone = phone;
        this.address = address;
        this.notes = notes;
        this.orderType = orderType;
    }

    validate({ tableNumber, items, orderType, customerName, phone }) {
        const validTypes = ['dine-in', 'pickup', 'delivery'];
        if (!validTypes.includes(orderType)) {
            throw new ValidationError(`Invalid order type: "${orderType}". Must be one of: ${validTypes.join(', ')}`);
        }

        if (orderType === 'dine-in') {
            if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
                throw new ValidationError('Table number must be a positive integer for dine-in orders');
            }
        }

        if (!Array.isArray(items) || items.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
    }

    // ── Business Rule Queries ────────────────────────────────────────────────

    isPickup() { return this.orderType === 'pickup'; }
    isDelivery() { return this.orderType === 'delivery'; }
    isDineIn() { return this.orderType === 'dine-in'; }

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
        return this.status.isServed() ||
            this.status.isDelivering() ||
            this.status.isPickupCompleted();
    }

    canBeCancelled() {
        return !this.status.isTerminal();
    }

    // ── Calculations ─────────────────────────────────────────────────────────

    calculateTotal() {
        let baseTotal = this.items.reduce(
            (total, item) => total.add(item.subtotal),
            new Money(0)
        );

        // Apply 3x2 promotions
        const promos3x2 = this.categoryPromotions.filter(p => p.promotionType === '3x2' && p.active);

        if (promos3x2.length > 0) {
            promos3x2.forEach(promo => {
                // Get all items in this category
                const categoryItems = this.items.filter(item => item.category === promo.category);
                const totalQuantity = categoryItems.reduce((sum, item) => sum + item.quantity, 0);
                if (totalQuantity < 3) return;

                // Expand items by quantity to handle them individually
                const expandedPrices = [];
                categoryItems.forEach(item => {
                    for (let i = 0; i < item.quantity; i++) {
                        expandedPrices.push(item.price.amount);
                    }
                });

                if (expandedPrices.length < 3) return;

                // Sort descending (pay the most expensive ones)
                expandedPrices.sort((a, b) => b - a);

                // For every 3 items, the cheapest one is free
                let discountAmount = 0;
                for (let i = 2; i < expandedPrices.length; i += 3) {
                    discountAmount += expandedPrices[i];
                }

                if (discountAmount > 0) {
                    baseTotal = baseTotal.subtract(new Money(discountAmount));
                }
            });
        }

        return baseTotal;
    }

    get total() {
        return this.calculateTotal();
    }

    // ── Actions (return new Order — immutable pattern) ────────────────────────

    updateStatus(newStatus) {
        const newStatusObj = newStatus instanceof OrderStatus
            ? newStatus
            : new OrderStatus(newStatus);

        if (!this.status.canTransitionTo(newStatusObj.value)) {
            throw new ValidationError(
                `Cannot transition from "${this.status.value}" to "${newStatusObj.value}"`
            );
        }

        return new Order({ ...this.toPlain(), status: newStatusObj, updatedAt: new Date() });
    }

    cancel(reason = null) {
        if (!this.canBeCancelled()) {
            throw new ValidationError(`Cannot cancel an order in "${this.status.value}" status`);
        }
        return new Order({
            ...this.toPlain(),
            status: OrderStatus.CANCELLED,
            notes: reason ? `${this.notes || ''} [CANCELLED: ${reason}]`.trim() : this.notes,
            updatedAt: new Date()
        });
    }

    updateItems(newItems) {
        if (!this.canBeEdited()) {
            throw new ValidationError('Cannot edit order that is not in "Creado" status');
        }
        const originalSnapshot = !this.isUpdated && !this.originalItemsSnapshot
            ? this.items.map(item => item.toJSON())
            : this.originalItemsSnapshot;

        return new Order({
            ...this.toPlain(),
            items: newItems,
            isUpdated: true,
            originalItemsSnapshot: originalSnapshot,
            updatedAt: new Date()
        });
    }

    acknowledgeUpdate() {
        return new Order({
            ...this.toPlain(),
            isUpdated: false,
            originalItemsSnapshot: null,
            updatedAt: new Date()
        });
    }

    addItem(item) {
        const newItem = item instanceof OrderItem ? item : new OrderItem(item);
        return new Order({ ...this.toPlain(), items: [...this.items, newItem], updatedAt: new Date() });
    }

    removeItem(itemId) {
        const filtered = this.items.filter(item => item.id !== itemId);
        if (filtered.length === 0) {
            throw new ValidationError('Order must have at least one item');
        }
        return new Order({ ...this.toPlain(), items: filtered, updatedAt: new Date() });
    }

    // ── Serialization ─────────────────────────────────────────────────────────

    /**
     * Raw plain object — for internal use (recreating from toPlain() spread)
     */
    toPlain() {
        return {
            id: this.id,
            tableNumber: this.tableNumber,
            status: this.status.value,
            items: this.items.map(item => item.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            isUpdated: this.isUpdated,
            originalItemsSnapshot: this.originalItemsSnapshot,
            customerName: this.customerName,
            phone: this.phone,
            address: this.address,
            notes: this.notes,
            orderType: this.orderType
        };
    }

    /**
     * JSON for API responses
     */
    toJSON() {
        return {
            ...this.toPlain(),
            total: this.total.amount,
            items: this.items.map(item => item.toJSON())
        };
    }
}

module.exports = Order;

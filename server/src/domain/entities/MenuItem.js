const Money = require('../value-objects/Money');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * MenuItem Entity
 * Represents a menu item available for ordering.
 */
class MenuItem {
    constructor({ id, name, price, category, description = null, imageUrl = null, isAvailable = true, promotionType = null, promotionValue = 0, promotionActive = false, createdAt, updatedAt }) {
        this.validate({ name, price, category });

        this.id = id;
        this.name = name.trim();
        this.price = price instanceof Money ? price : new Money(price);
        this.category = category ? category.trim() : 'General';
        this.description = description;
        this.imageUrl = imageUrl;
        this.isAvailable = Boolean(isAvailable);
        this.promotionType = promotionType;
        this.promotionValue = promotionValue;
        this.promotionActive = Boolean(promotionActive);
        this.createdAt = createdAt ? new Date(createdAt) : new Date();
        this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    }

    getFinalPrice() {
        if (!this.promotionActive) return this.price.amount;

        if (this.promotionType === 'percentage') {
            const discount = this.price.amount * (this.promotionValue / 100);
            return Math.max(0, this.price.amount - discount);
        } else if (this.promotionType === 'fixed') {
            return Math.max(0, this.price.amount - this.promotionValue);
        }
        return this.price.amount;
    }

    validate({ name, price, category }) {
        if (!name || typeof name !== 'string' || name.trim() === '') {
            throw new ValidationError('MenuItem name is required');
        }
        const priceValue = price instanceof Money ? price.amount : price;
        if (typeof priceValue !== 'number' || priceValue < 0) {
            throw new ValidationError('MenuItem price must be a non-negative number');
        }
    }

    // ── Business Rules ────────────────────────────────────────────────────────

    canBeOrdered() {
        return this.isAvailable;
    }

    enable() {
        return new MenuItem({ ...this.toPlain(), isAvailable: true, updatedAt: new Date() });
    }

    disable() {
        return new MenuItem({ ...this.toPlain(), isAvailable: false, updatedAt: new Date() });
    }

    updatePrice(newPrice) {
        return new MenuItem({ ...this.toPlain(), price: newPrice, updatedAt: new Date() });
    }

    // ── Serialization ─────────────────────────────────────────────────────────

    toPlain() {
        return {
            id: this.id,
            name: this.name,
            price: this.price.amount,
            finalPrice: this.getFinalPrice(),
            category: this.category,
            description: this.description,
            imageUrl: this.imageUrl,
            isAvailable: this.isAvailable,
            promotionType: this.promotionType,
            promotionValue: this.promotionValue,
            promotionActive: this.promotionActive,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    toJSON() {
        return this.toPlain();
    }
}

module.exports = MenuItem;

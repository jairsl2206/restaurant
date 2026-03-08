/**
 * CategoryPromotion Entity
 * Represents a promotion applied to an entire category of products.
 */
class CategoryPromotion {
    constructor({ id, category, promotionType, promotionValue, active = true, createdAt = new Date() }) {
        this.id = id;
        this.category = category;
        this.promotionType = promotionType; // 'percentage', 'fixed', or '3x2'
        this.promotionValue = promotionValue;
        this.active = active;
        this.createdAt = createdAt;
    }

    isActive() {
        return this.active;
    }

    is3x2() {
        return this.promotionType === '3x2';
    }

    calculateDiscount(price) {
        if (!this.active) return 0;

        if (this.promotionType === 'percentage') {
            return price * (this.promotionValue / 100);
        } else if (this.promotionType === 'fixed') {
            return this.promotionValue;
        }
        // 3x2 is calculated at Order level across multiple items
        return 0;
    }

    toPlain() {
        return {
            id: this.id,
            category: this.category,
            promotionType: this.promotionType,
            promotionValue: this.promotionValue,
            active: this.active,
            createdAt: this.createdAt
        };
    }

    toJSON() {
        return this.toPlain();
    }
}

module.exports = CategoryPromotion;

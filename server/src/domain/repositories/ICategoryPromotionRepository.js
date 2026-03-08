/**
 * ICategoryPromotionRepository
 * Interface for category promotion persistence
 */
class ICategoryPromotionRepository {
    async findAll() {
        throw new Error('Method not implemented');
    }

    async findActive() {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async save(promotion) {
        throw new Error('Method not implemented');
    }

    async update(id, promotionData) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }
}

module.exports = ICategoryPromotionRepository;

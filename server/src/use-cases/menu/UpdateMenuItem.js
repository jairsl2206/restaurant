const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UpdateMenuItem Use Case
 */
class UpdateMenuItem {
    constructor(menuRepository) {
        this.menuRepository = menuRepository;
    }

    async execute({ id, name, price, category, description, imageUrl, isAvailable, promotionType, promotionValue, promotionActive }) {
        if (!id) throw new ValidationError('MenuItem ID is required');

        const existing = await this.menuRepository.findById(id);
        if (!existing) throw new NotFoundError(`MenuItem with ID ${id} not found`);

        const updated = new (require('../../domain/entities/MenuItem'))({
            ...existing.toPlain(),
            ...(name !== undefined && { name }),
            ...(price !== undefined && { price }),
            ...(category !== undefined && { category }),
            ...(description !== undefined && { description }),
            ...(imageUrl !== undefined && { imageUrl }),
            ...(isAvailable !== undefined && { isAvailable }),
            ...(promotionType !== undefined && { promotionType }),
            ...(promotionValue !== undefined && { promotionValue }),
            ...(promotionActive !== undefined && { promotionActive }),
            updatedAt: new Date()
        });

        return this.menuRepository.update(updated);
    }
}

module.exports = UpdateMenuItem;

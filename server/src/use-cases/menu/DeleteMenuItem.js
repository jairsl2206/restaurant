const { NotFoundError, ValidationError } = require('../../shared/errors/errorTypes');

/**
 * DeleteMenuItem Use Case
 */
class DeleteMenuItem {
    constructor(menuRepository) {
        this.menuRepository = menuRepository;
    }

    async execute({ id }) {
        if (!id) throw new ValidationError('MenuItem ID is required');

        const existing = await this.menuRepository.findById(id);
        if (!existing) throw new NotFoundError(`MenuItem with ID ${id} not found`);

        await this.menuRepository.delete(id);
        return { deleted: true, id };
    }
}

module.exports = DeleteMenuItem;

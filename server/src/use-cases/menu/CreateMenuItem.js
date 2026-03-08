const MenuItem = require('../../domain/entities/MenuItem');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * CreateMenuItem Use Case
 */
class CreateMenuItem {
    constructor(menuRepository) {
        this.menuRepository = menuRepository;
    }

    async execute({ name, price, category, description, imageUrl }) {
        if (!name) throw new ValidationError('Name is required');
        if (price === undefined || price === null) throw new ValidationError('Price is required');

        const menuItem = new MenuItem({ id: null, name, price, category, description, imageUrl, isAvailable: true });
        return this.menuRepository.save(menuItem);
    }
}

module.exports = CreateMenuItem;

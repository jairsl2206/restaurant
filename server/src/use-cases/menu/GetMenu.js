/**
 * GetMenu Use Case
 */
class GetMenu {
    constructor(menuRepository) {
        this.menuRepository = menuRepository;
    }

    async execute({ availableOnly = false } = {}) {
        return availableOnly
            ? this.menuRepository.findAvailable()
            : this.menuRepository.findAll();
    }
}

module.exports = GetMenu;

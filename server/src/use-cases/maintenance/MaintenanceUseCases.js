class MaintenanceUseCases {
    constructor(menuRepository, orderRepository) {
        this.menuRepository = menuRepository;
        this.orderRepository = orderRepository;
    }

    async clearMenu() {
        // IMenuRepository needs a clearAll method. 
        // For simplicity and safety, we can implement it in the repo or use delete with logic.
        // The legacy system had clearAllMenuItems.
        if (typeof this.menuRepository.clearAll === 'function') {
            return await this.menuRepository.clearAll();
        }
        throw new Error('Clear Menu not implemented in repository');
    }

    async clearOrders() {
        if (typeof this.orderRepository.clearAll === 'function') {
            return await this.orderRepository.clearAll();
        }
        throw new Error('Clear Orders not implemented in repository');
    }
}

module.exports = MaintenanceUseCases;

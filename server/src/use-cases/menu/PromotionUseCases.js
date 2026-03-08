class GetCategoryPromotions {
    constructor(promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    async execute() {
        return await this.promotionRepository.findAll();
    }
}

class CreateCategoryPromotion {
    constructor(promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    async execute(promoData) {
        return await this.promotionRepository.save(promoData);
    }
}

class UpdateCategoryPromotion {
    constructor(promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    async execute({ id, data }) {
        return await this.promotionRepository.update(id, data);
    }
}

class DeleteCategoryPromotion {
    constructor(promotionRepository) {
        this.promotionRepository = promotionRepository;
    }

    async execute({ id }) {
        return await this.promotionRepository.delete(id);
    }
}

module.exports = {
    GetCategoryPromotions,
    CreateCategoryPromotion,
    UpdateCategoryPromotion,
    DeleteCategoryPromotion
};

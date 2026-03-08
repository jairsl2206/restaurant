class PromotionController {
    constructor({ getCategoryPromotions, createCategoryPromotion, updateCategoryPromotion, deleteCategoryPromotion }) {
        this.getCategoryPromotions = getCategoryPromotions;
        this.createCategoryPromotion = createCategoryPromotion;
        this.updateCategoryPromotion = updateCategoryPromotion;
        this.deleteCategoryPromotion = deleteCategoryPromotion;
    }

    async getPromotions(req, res, next) {
        try {
            const promotions = await this.getCategoryPromotions.execute();
            res.json(promotions.map(p => p.toJSON()));
        } catch (error) {
            next(error);
        }
    }

    async createPromotion(req, res, next) {
        try {
            const id = await this.createCategoryPromotion.execute(req.body);
            res.status(201).json({ id, message: 'Promotion created' });
        } catch (error) {
            next(error);
        }
    }

    async updatePromotion(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            await this.updateCategoryPromotion.execute({ id, data: req.body });
            res.json({ message: 'Promotion updated' });
        } catch (error) {
            next(error);
        }
    }

    async deletePromotion(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            await this.deleteCategoryPromotion.execute({ id });
            res.json({ message: 'Promotion deleted' });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = PromotionController;

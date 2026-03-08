const ICategoryPromotionRepository = require('../../../domain/repositories/ICategoryPromotionRepository');
const CategoryPromotion = require('../../../domain/entities/CategoryPromotion');

class CategoryPromotionRepository extends ICategoryPromotionRepository {
    constructor(db) {
        super();
        this.db = db;
    }

    async findAll() {
        const rows = await this.db.all('SELECT * FROM category_promotions ORDER BY created_at DESC');
        return rows.map(this._mapToEntity);
    }

    async findActive() {
        const rows = await this.db.all('SELECT * FROM category_promotions WHERE active = 1');
        return rows.map(this._mapToEntity);
    }

    async findById(id) {
        const row = await this.db.get('SELECT * FROM category_promotions WHERE id = ?', [id]);
        return row ? this._mapToEntity(row) : null;
    }

    async save(promoData) {
        const { category, promotionType, promotionValue, active } = promoData;
        const sql = `
            INSERT INTO category_promotions (category, promotion_type, promotion_value, active)
            VALUES (?, ?, ?, ?)
        `;
        const result = await this.db.run(sql, [
            category,
            promotionType,
            promotionValue,
            active ? 1 : 0
        ]);
        return result.lastID;
    }

    async update(id, data) {
        const sets = [];
        const params = [];

        if (data.category !== undefined) { sets.push('category = ?'); params.push(data.category); }
        if (data.promotionType !== undefined) { sets.push('promotion_type = ?'); params.push(data.promotionType); }
        if (data.promotionValue !== undefined) { sets.push('promotion_value = ?'); params.push(data.promotionValue); }
        if (data.active !== undefined) { sets.push('active = ?'); params.push(data.active ? 1 : 0); }

        if (sets.length === 0) return;

        params.push(id);
        const sql = `UPDATE category_promotions SET ${sets.join(', ')} WHERE id = ?`;
        await this.db.run(sql, params);
    }

    async delete(id) {
        await this.db.run('DELETE FROM category_promotions WHERE id = ?', [id]);
    }

    _mapToEntity(row) {
        return new CategoryPromotion({
            id: row.id,
            category: row.category,
            promotionType: row.promotion_type,
            promotionValue: row.promotion_value,
            active: !!row.active,
            createdAt: new Date(row.created_at)
        });
    }
}

module.exports = CategoryPromotionRepository;

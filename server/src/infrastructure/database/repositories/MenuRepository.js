const IMenuRepository = require('../../../domain/repositories/IMenuRepository');
const MenuItem = require('../../../domain/entities/MenuItem');

/**
 * MenuRepository Implementation using SQLite (via DatabaseConnection)
 */
class MenuRepository extends IMenuRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    _mapRowToMenuItem(row) {
        return new MenuItem({
            id: row.id,
            name: row.name,
            price: row.price,
            category: row.category || 'General',
            description: row.description || null,
            imageUrl: row.image_url || null,
            // Support both 'available' (legacy) and 'is_available'
            isAvailable: row.available !== undefined ? (row.available !== 0) : (row.is_available !== 0),
            promotionType: row.promotion_type || null,
            promotionValue: row.promotion_value || 0,
            promotionActive: row.promotion_active !== 0,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        });
    }

    async findAll() {
        const rows = await this.db.all('SELECT * FROM menu_items ORDER BY category ASC, name ASC');
        return rows.map(row => this._mapRowToMenuItem(row));
    }

    async findAvailable() {
        const rows = await this.db.all(
            "SELECT * FROM menu_items WHERE (available IS NULL OR available != 0) AND (is_available IS NULL OR is_available != 0) ORDER BY category ASC, name ASC"
        );
        return rows.map(row => this._mapRowToMenuItem(row));
    }

    async findByCategory(category) {
        const rows = await this.db.all(
            'SELECT * FROM menu_items WHERE category = ? ORDER BY name ASC',
            [category]
        );
        return rows.map(row => this._mapRowToMenuItem(row));
    }

    async findById(id) {
        const row = await this.db.get('SELECT * FROM menu_items WHERE id = ?', [id]);
        return row ? this._mapRowToMenuItem(row) : null;
    }

    async save(menuItem) {
        const { lastID } = await this.db.run(
            `INSERT INTO menu_items (name, price, category, description, image_url, available, is_available, promotion_type, promotion_value, promotion_active)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                menuItem.name,
                menuItem.price.amount,
                menuItem.category,
                menuItem.description,
                menuItem.imageUrl,
                menuItem.isAvailable ? 1 : 0, // save to both for compatibility
                menuItem.isAvailable ? 1 : 0,
                menuItem.promotionType,
                menuItem.promotionValue,
                menuItem.promotionActive ? 1 : 0
            ]
        );
        return this.findById(lastID);
    }

    async update(menuItem) {
        await this.db.run(
            `UPDATE menu_items
             SET name = ?, price = ?, category = ?, description = ?, image_url = ?, available = ?, is_available = ?, promotion_type = ?, promotion_value = ?, promotion_active = ?
             WHERE id = ?`,
            [
                menuItem.name,
                menuItem.price.amount,
                menuItem.category,
                menuItem.description,
                menuItem.imageUrl,
                menuItem.isAvailable ? 1 : 0,
                menuItem.isAvailable ? 1 : 0,
                menuItem.promotionType,
                menuItem.promotionValue,
                menuItem.promotionActive ? 1 : 0,
                menuItem.id
            ]
        );
        return this.findById(menuItem.id);
    }

    async delete(id) {
        const { changes } = await this.db.run('DELETE FROM menu_items WHERE id = ?', [id]);
        return changes > 0;
    }

    async clearAll() {
        await this.db.run('DELETE FROM menu_items');
        return true;
    }
}

module.exports = MenuRepository;

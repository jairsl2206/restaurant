/**
 * MenuController — CRUD for menu items
 */
class MenuController {
    constructor({ getMenuUseCase, createMenuItemUseCase, updateMenuItemUseCase, deleteMenuItemUseCase }) {
        this.getMenuUseCase = getMenuUseCase;
        this.createMenuItemUseCase = createMenuItemUseCase;
        this.updateMenuItemUseCase = updateMenuItemUseCase;
        this.deleteMenuItemUseCase = deleteMenuItemUseCase;
    }

    async getMenu(req, res, next) {
        try {
            const availableOnly = req.query.available === 'true';
            const items = await this.getMenuUseCase.execute({ availableOnly });
            res.json(items.map(i => i.toJSON()));
        } catch (err) { next(err); }
    }

    async createItem(req, res, next) {
        try {
            const { name, price, category, description, imageUrl } = req.body;
            const item = await this.createMenuItemUseCase.execute({ name, price, category, description, imageUrl });
            res.status(201).json(item.toJSON());
        } catch (err) { next(err); }
    }

    async updateItem(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const item = await this.updateMenuItemUseCase.execute({ id, ...req.body });
            res.json(item.toJSON());
        } catch (err) { next(err); }
    }

    async deleteItem(req, res, next) {
        try {
            const id = parseInt(req.params.id, 10);
            const result = await this.deleteMenuItemUseCase.execute({ id });
            res.json(result);
        } catch (err) { next(err); }
    }
}

module.exports = MenuController;

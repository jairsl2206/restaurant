class SettingsController {
    constructor({ settingsRepository }) {
        this.settingsRepository = settingsRepository;
    }

    async getSettings(req, res, next) {
        try {
            const settings = await this.settingsRepository.getAll();
            const defaults = {
                restaurant_name: 'Restaurant POS',
                restaurant_logo: '🍔',
                max_tables: 20
            };
            res.json({ ...defaults, ...settings });
        } catch (error) {
            next(error);
        }
    }

    async updateSettings(req, res, next) {
        try {
            await this.settingsRepository.setMany(req.body);
            res.json({ success: true });
        } catch (error) {
            next(error);
        }
    }
}

module.exports = SettingsController;

const ISettingsRepository = require('../../../domain/repositories/ISettingsRepository');

/**
 * SettingsRepository Implementation using SQLite (via DatabaseConnection)
 * Settings are stored as key-value pairs in the `settings` table.
 */
class SettingsRepository extends ISettingsRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    async getAll() {
        const rows = await this.db.all('SELECT key, value FROM settings');
        return rows.reduce((acc, row) => {
            acc[row.key] = row.value;
            return acc;
        }, {});
    }

    async get(key) {
        const row = await this.db.get('SELECT value FROM settings WHERE key = ?', [key]);
        return row ? row.value : null;
    }

    async set(key, value) {
        await this.db.run(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            [key, value]
        );
    }

    async setMany(settings) {
        await this.db.transaction(async (db) => {
            const promises = Object.entries(settings).map(([key, value]) =>
                db.run(
                    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
                    [key, value]
                )
            );
            await Promise.all(promises);
        });
    }
}

module.exports = SettingsRepository;

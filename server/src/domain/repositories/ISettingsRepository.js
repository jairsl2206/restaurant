/**
 * ISettingsRepository Interface
 * Defines the contract for application settings persistence.
 * Settings are key-value pairs stored in the database.
 */
class ISettingsRepository {
    /**
     * Get all settings as a key-value map
     * @returns {Promise<Object>} - e.g., { restaurantName: 'Mi Rest', whatsappNumber: '521...' }
     */
    async getAll() { throw new Error('getAll() must be implemented'); }

    /**
     * Get a single setting by key
     * @returns {Promise<string|null>}
     */
    async get(key) { throw new Error('get() must be implemented'); }

    /**
     * Set a single setting
     * @returns {Promise<void>}
     */
    async set(key, value) { throw new Error('set() must be implemented'); }

    /**
     * Set multiple settings at once
     * @param {Object} settings - key-value pairs to update
     * @returns {Promise<void>}
     */
    async setMany(settings) { throw new Error('setMany() must be implemented'); }
}

module.exports = ISettingsRepository;

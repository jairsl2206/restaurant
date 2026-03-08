/**
 * IUserRepository Interface
 * Defines the contract for user persistence.
 */
class IUserRepository {
    /** @returns {Promise<User[]>} */
    async findAll() { throw new Error('findAll() must be implemented'); }

    /** @returns {Promise<User|null>} */
    async findById(id) { throw new Error('findById() must be implemented'); }

    /** @returns {Promise<User|null>} */
    async findByUsername(username) { throw new Error('findByUsername() must be implemented'); }

    /** @returns {Promise<User>} - Saved user with generated ID */
    async save(user) { throw new Error('save() must be implemented'); }

    /** @returns {Promise<User>} - Updated user */
    async update(user) { throw new Error('update() must be implemented'); }

    /** @returns {Promise<boolean>} */
    async delete(id) { throw new Error('delete() must be implemented'); }
}

module.exports = IUserRepository;

/**
 * ICustomerRepository Interface
 * Defines the contract for customer persistence.
 */
class ICustomerRepository {
    /** @returns {Promise<Customer[]>} */
    async findAll() { throw new Error('findAll() must be implemented'); }

    /** @returns {Promise<Customer|null>} */
    async findById(id) { throw new Error('findById() must be implemented'); }

    /** @returns {Promise<Customer|null>} */
    async findByPhone(phone) { throw new Error('findByPhone() must be implemented'); }

    /** @returns {Promise<Customer>} */
    async save(customer) { throw new Error('save() must be implemented'); }

    /** @returns {Promise<Customer>} */
    async update(customer) { throw new Error('update() must be implemented'); }

    /** @returns {Promise<boolean>} */
    async delete(id) { throw new Error('delete() must be implemented'); }
}

module.exports = ICustomerRepository;

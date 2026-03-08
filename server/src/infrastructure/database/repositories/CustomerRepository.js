const ICustomerRepository = require('../../../domain/repositories/ICustomerRepository');
const Customer = require('../../../domain/entities/Customer');

/**
 * CustomerRepository Implementation using SQLite (via DatabaseConnection)
 */
class CustomerRepository extends ICustomerRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    _mapRowToCustomer(row) {
        return new Customer({
            id: row.id,
            name: row.name,
            phone: row.phone,
            address: row.address || null,
            notes: row.notes || null,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        });
    }

    async findAll() {
        const rows = await this.db.all('SELECT * FROM customers ORDER BY name ASC');
        return rows.map(row => this._mapRowToCustomer(row));
    }

    async findById(id) {
        const row = await this.db.get('SELECT * FROM customers WHERE id = ?', [id]);
        return row ? this._mapRowToCustomer(row) : null;
    }

    async findByPhone(phone) {
        const row = await this.db.get('SELECT * FROM customers WHERE phone = ?', [phone]);
        return row ? this._mapRowToCustomer(row) : null;
    }

    async save(customer) {
        const { lastID } = await this.db.run(
            'INSERT INTO customers (name, phone, address, notes) VALUES (?, ?, ?, ?)',
            [customer.name, customer.phone, customer.address, customer.notes]
        );
        return this.findById(lastID);
    }

    async update(customer) {
        await this.db.run(
            'UPDATE customers SET name = ?, phone = ?, address = ?, notes = ? WHERE id = ?',
            [customer.name, customer.phone, customer.address, customer.notes, customer.id]
        );
        return this.findById(customer.id);
    }

    async delete(id) {
        const { changes } = await this.db.run('DELETE FROM customers WHERE id = ?', [id]);
        return changes > 0;
    }
}

module.exports = CustomerRepository;

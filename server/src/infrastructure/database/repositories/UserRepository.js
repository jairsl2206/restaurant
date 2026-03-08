const IUserRepository = require('../../../domain/repositories/IUserRepository');
const User = require('../../../domain/entities/User');

/**
 * UserRepository Implementation using SQLite (via DatabaseConnection)
 */
class UserRepository extends IUserRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    _mapRowToUser(row) {
        return new User({
            id: row.id,
            username: row.username,
            passwordHash: row.password,
            role: row.role,
            createdAt: row.created_at ? new Date(row.created_at) : new Date(),
            updatedAt: row.updated_at ? new Date(row.updated_at) : new Date()
        });
    }

    async findAll() {
        const rows = await this.db.all('SELECT * FROM users ORDER BY username ASC');
        return rows.map(row => this._mapRowToUser(row));
    }

    async findById(id) {
        const row = await this.db.get('SELECT * FROM users WHERE id = ?', [id]);
        return row ? this._mapRowToUser(row) : null;
    }

    async findByUsername(username) {
        const row = await this.db.get('SELECT * FROM users WHERE username = ?', [username]);
        return row ? this._mapRowToUser(row) : null;
    }

    async save(user) {
        const { lastID } = await this.db.run(
            'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
            [user.username, user.passwordHash, user.role.value]
        );
        return this.findById(lastID);
    }

    async update(user) {
        await this.db.run(
            'UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?',
            [user.username, user.passwordHash, user.role.value, user.id]
        );
        return this.findById(user.id);
    }

    async delete(id) {
        const { changes } = await this.db.run('DELETE FROM users WHERE id = ?', [id]);
        return changes > 0;
    }
}

module.exports = UserRepository;

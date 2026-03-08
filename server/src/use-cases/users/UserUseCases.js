const bcrypt = require('bcryptjs');
const User = require('../../domain/entities/User');
const UserRole = require('../../domain/value-objects/UserRole');
const { ValidationError, NotFoundError } = require('../../shared/errors/errorTypes');

/**
 * User Use Cases — CRUD operations
 */

class GetUsers {
    constructor(userRepository) { this.userRepository = userRepository; }
    async execute() { return this.userRepository.findAll(); }
}

class CreateUser {
    constructor(userRepository) { this.userRepository = userRepository; }

    async execute({ username, password, role }) {
        if (!username) throw new ValidationError('Username is required');
        if (!password) throw new ValidationError('Password is required');
        if (!role) throw new ValidationError('Role is required');

        const existing = await this.userRepository.findByUsername(username);
        if (existing) throw new ValidationError(`Username "${username}" is already taken`);

        const passwordHash = await bcrypt.hash(password, 10);
        const user = new User({ id: null, username, passwordHash, role: new UserRole(role) });
        return this.userRepository.save(user);
    }
}

class UpdateUser {
    constructor(userRepository) { this.userRepository = userRepository; }

    async execute({ id, username, password, role }) {
        if (!id) throw new ValidationError('User ID is required');

        const existing = await this.userRepository.findById(id);
        if (!existing) throw new NotFoundError(`User with ID ${id} not found`);

        let passwordHash = existing.passwordHash;
        if (password) {
            passwordHash = await bcrypt.hash(password, 10);
        }

        const updated = new User({
            ...existing.toPlain(),
            username: username ?? existing.username,
            passwordHash,
            role: role ? new UserRole(role) : existing.role,
            updatedAt: new Date()
        });

        return this.userRepository.update(updated);
    }
}

class DeleteUser {
    constructor(userRepository) { this.userRepository = userRepository; }

    async execute({ id }) {
        if (!id) throw new ValidationError('User ID is required');

        const existing = await this.userRepository.findById(id);
        if (!existing) throw new NotFoundError(`User with ID ${id} not found`);

        if (existing.isAdmin()) {
            // Prevent deleting the last admin
            const allUsers = await this.userRepository.findAll();
            const adminCount = allUsers.filter(u => u.isAdmin()).length;
            if (adminCount <= 1) {
                throw new ValidationError('Cannot delete the last administrator');
            }
        }

        await this.userRepository.delete(id);
        return { deleted: true, id };
    }
}

module.exports = { GetUsers, CreateUser, UpdateUser, DeleteUser };

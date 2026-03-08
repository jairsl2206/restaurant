const UserRole = require('../value-objects/UserRole');
const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * User Entity
 * Represents a system user with authentication and role management.
 */
class User {
    constructor({ id, username, passwordHash, role, createdAt, updatedAt }) {
        this.validate({ username, passwordHash });

        this.id = id;
        this.username = username.trim().toLowerCase();
        this.passwordHash = passwordHash;
        this.role = role instanceof UserRole ? role : new UserRole(role);
        this.createdAt = createdAt ? new Date(createdAt) : new Date();
        this.updatedAt = updatedAt ? new Date(updatedAt) : new Date();
    }

    validate({ username, passwordHash }) {
        if (!username || typeof username !== 'string' || username.trim() === '') {
            throw new ValidationError('Username is required');
        }
        if (username.trim().length < 3) {
            throw new ValidationError('Username must be at least 3 characters');
        }
        if (!passwordHash || typeof passwordHash !== 'string') {
            throw new ValidationError('Password hash is required');
        }
    }

    // ── Business Rules ────────────────────────────────────────────────────────

    isAdmin() { return this.role.isAdmin(); }
    isWaiter() { return this.role.isWaiter(); }
    isCook() { return this.role.isCook(); }

    canManageMenu() { return this.role.canManageMenu(); }
    canManageUsers() { return this.role.canManageUsers(); }
    canCreateOrders() { return this.role.canCreateOrders(); }
    canEditOrders() { return this.role.canEditOrders(); }
    canViewReports() { return this.role.isAdmin(); }
    canViewKitchenQueue() { return this.role.canViewKitchenQueue(); }

    changeRole(newRole) {
        return new User({
            ...this.toPlain(),
            role: newRole,
            updatedAt: new Date()
        });
    }

    changePassword(newPasswordHash) {
        if (!newPasswordHash || typeof newPasswordHash !== 'string') {
            throw new ValidationError('New password hash is required');
        }
        return new User({ ...this.toPlain(), passwordHash: newPasswordHash, updatedAt: new Date() });
    }

    // ── Serialization ─────────────────────────────────────────────────────────

    toPlain() {
        return {
            id: this.id,
            username: this.username,
            passwordHash: this.passwordHash,
            role: this.role.value,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    /** Safe public JSON — never exposes passwordHash */
    toJSON() {
        return {
            id: this.id,
            username: this.username,
            role: this.role.value,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }
}

module.exports = User;

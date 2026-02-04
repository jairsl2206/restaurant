const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UserRole Value Object
 * Represents user roles with validation
 */
class UserRole {
    static ADMIN = 'admin';
    static WAITER = 'waiter';
    static COOK = 'cook';

    static ALL_ROLES = [
        UserRole.ADMIN,
        UserRole.WAITER,
        UserRole.COOK
    ];

    constructor(value) {
        if (!this.isValid(value)) {
            throw new ValidationError(`Invalid user role: ${value}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() {
        return this._value;
    }

    isValid(value) {
        return UserRole.ALL_ROLES.includes(value);
    }

    isAdmin() {
        return this._value === UserRole.ADMIN;
    }

    isWaiter() {
        return this._value === UserRole.WAITER;
    }

    isCook() {
        return this._value === UserRole.COOK;
    }

    canManageMenu() {
        return this.isAdmin();
    }

    canManageUsers() {
        return this.isAdmin();
    }

    canCreateOrders() {
        return this.isWaiter() || this.isAdmin();
    }

    canEditOrders() {
        return this.isWaiter() || this.isAdmin();
    }

    canViewKitchenQueue() {
        return this.isCook() || this.isAdmin();
    }

    equals(other) {
        return other instanceof UserRole && this._value === other._value;
    }

    toString() {
        return this._value;
    }
}

module.exports = UserRole;

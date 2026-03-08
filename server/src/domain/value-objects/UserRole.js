const { ValidationError } = require('../../shared/errors/errorTypes');

/**
 * UserRole Value Object
 * Maps to the user_role ENUM: waiter | cook | admin | manager
 */
class UserRole {
    static WAITER  = 'waiter';
    static COOK    = 'cook';
    static ADMIN   = 'admin';
    static MANAGER = 'manager';

    static ALL_ROLES = [
        UserRole.WAITER,
        UserRole.COOK,
        UserRole.ADMIN,
        UserRole.MANAGER
    ];

    constructor(value) {
        if (!UserRole.ALL_ROLES.includes(value)) {
            throw new ValidationError(`Invalid user role: "${value}". Valid: ${UserRole.ALL_ROLES.join(', ')}`);
        }
        this._value = value;
        Object.freeze(this);
    }

    get value() { return this._value; }

    isAdmin()   { return this._value === UserRole.ADMIN;   }
    isWaiter()  { return this._value === UserRole.WAITER;  }
    isCook()    { return this._value === UserRole.COOK;    }
    isManager() { return this._value === UserRole.MANAGER; }

    canManageMenu()       { return this.isAdmin() || this.isManager(); }
    canManageUsers()      { return this.isAdmin() || this.isManager(); }
    canViewReports()      { return this.isAdmin() || this.isManager(); }
    canCreateOrders()     { return this.isWaiter() || this.isAdmin() || this.isManager(); }
    canEditOrders()       { return this.isWaiter() || this.isAdmin() || this.isManager(); }
    canViewKitchenQueue() { return this.isCook()   || this.isAdmin() || this.isManager(); }

    equals(other) {
        return other instanceof UserRole && this._value === other._value;
    }

    toString() { return this._value; }
}

module.exports = UserRole;

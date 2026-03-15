const UserRole = require('../../../src/domain/value-objects/UserRole');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('UserRole Value Object', () => {
    describe('constructor', () => {
        test('should create UserRole with valid role', () => {
            const role = new UserRole('admin');
            expect(role.value).toBe('admin');
        });

        test('should create UserRole for all valid roles', () => {
            const roles = ['waiter', 'cook', 'admin', 'manager'];
            roles.forEach(roleValue => {
                const role = new UserRole(roleValue);
                expect(role.value).toBe(roleValue);
            });
        });

        test('should throw ValidationError for invalid role', () => {
            expect(() => new UserRole('superuser')).toThrow(ValidationError);
            expect(() => new UserRole('chef')).toThrow(ValidationError);
        });

        test('should throw ValidationError with helpful message', () => {
            expect(() => new UserRole('invalid')).toThrow('Invalid user role');
            expect(() => new UserRole('invalid')).toThrow('waiter');
            expect(() => new UserRole('invalid')).toThrow('cook');
            expect(() => new UserRole('invalid')).toThrow('admin');
            expect(() => new UserRole('invalid')).toThrow('manager');
        });

        test('should throw ValidationError for null/undefined', () => {
            expect(() => new UserRole(null)).toThrow(ValidationError);
            expect(() => new UserRole(undefined)).toThrow(ValidationError);
        });

        test('should throw ValidationError for empty string', () => {
            expect(() => new UserRole('')).toThrow(ValidationError);
        });

        test('should throw ValidationError for case-sensitive roles', () => {
            expect(() => new UserRole('Admin')).toThrow(ValidationError);
            expect(() => new UserRole('WAITER')).toThrow(ValidationError);
        });

        test('should freeze the object', () => {
            const role = new UserRole('admin');
            expect(Object.isFrozen(role)).toBe(true);
        });
    });

    describe('role constants', () => {
        test('should have all role constants defined', () => {
            expect(UserRole.WAITER).toBe('waiter');
            expect(UserRole.COOK).toBe('cook');
            expect(UserRole.ADMIN).toBe('admin');
            expect(UserRole.MANAGER).toBe('manager');
        });

        test('should have ALL_ROLES array with all roles', () => {
            expect(UserRole.ALL_ROLES).toHaveLength(4);
            expect(UserRole.ALL_ROLES).toContain('waiter');
            expect(UserRole.ALL_ROLES).toContain('cook');
            expect(UserRole.ALL_ROLES).toContain('admin');
            expect(UserRole.ALL_ROLES).toContain('manager');
        });
    });

    describe('role check methods', () => {
        test('isAdmin should return true only for admin', () => {
            expect(new UserRole('admin').isAdmin()).toBe(true);
            expect(new UserRole('waiter').isAdmin()).toBe(false);
            expect(new UserRole('cook').isAdmin()).toBe(false);
            expect(new UserRole('manager').isAdmin()).toBe(false);
        });

        test('isWaiter should return true only for waiter', () => {
            expect(new UserRole('waiter').isWaiter()).toBe(true);
            expect(new UserRole('admin').isWaiter()).toBe(false);
            expect(new UserRole('cook').isWaiter()).toBe(false);
            expect(new UserRole('manager').isWaiter()).toBe(false);
        });

        test('isCook should return true only for cook', () => {
            expect(new UserRole('cook').isCook()).toBe(true);
            expect(new UserRole('admin').isCook()).toBe(false);
            expect(new UserRole('waiter').isCook()).toBe(false);
            expect(new UserRole('manager').isCook()).toBe(false);
        });

        test('isManager should return true only for manager', () => {
            expect(new UserRole('manager').isManager()).toBe(true);
            expect(new UserRole('admin').isManager()).toBe(false);
            expect(new UserRole('waiter').isManager()).toBe(false);
            expect(new UserRole('cook').isManager()).toBe(false);
        });
    });

    describe('permission methods', () => {
        describe('canManageMenu', () => {
            test('should return true for admin', () => {
                expect(new UserRole('admin').canManageMenu()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canManageMenu()).toBe(true);
            });

            test('should return false for waiter and cook', () => {
                expect(new UserRole('waiter').canManageMenu()).toBe(false);
                expect(new UserRole('cook').canManageMenu()).toBe(false);
            });
        });

        describe('canManageUsers', () => {
            test('should return true for admin', () => {
                expect(new UserRole('admin').canManageUsers()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canManageUsers()).toBe(true);
            });

            test('should return false for waiter and cook', () => {
                expect(new UserRole('waiter').canManageUsers()).toBe(false);
                expect(new UserRole('cook').canManageUsers()).toBe(false);
            });
        });

        describe('canViewReports', () => {
            test('should return true for admin', () => {
                expect(new UserRole('admin').canViewReports()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canViewReports()).toBe(true);
            });

            test('should return false for waiter and cook', () => {
                expect(new UserRole('waiter').canViewReports()).toBe(false);
                expect(new UserRole('cook').canViewReports()).toBe(false);
            });
        });

        describe('canCreateOrders', () => {
            test('should return true for waiter', () => {
                expect(new UserRole('waiter').canCreateOrders()).toBe(true);
            });

            test('should return true for admin', () => {
                expect(new UserRole('admin').canCreateOrders()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canCreateOrders()).toBe(true);
            });

            test('should return false for cook', () => {
                expect(new UserRole('cook').canCreateOrders()).toBe(false);
            });
        });

        describe('canEditOrders', () => {
            test('should return true for waiter', () => {
                expect(new UserRole('waiter').canEditOrders()).toBe(true);
            });

            test('should return true for admin', () => {
                expect(new UserRole('admin').canEditOrders()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canEditOrders()).toBe(true);
            });

            test('should return false for cook', () => {
                expect(new UserRole('cook').canEditOrders()).toBe(false);
            });
        });

        describe('canViewKitchenQueue', () => {
            test('should return true for cook', () => {
                expect(new UserRole('cook').canViewKitchenQueue()).toBe(true);
            });

            test('should return true for admin', () => {
                expect(new UserRole('admin').canViewKitchenQueue()).toBe(true);
            });

            test('should return true for manager', () => {
                expect(new UserRole('manager').canViewKitchenQueue()).toBe(true);
            });

            test('should return false for waiter', () => {
                expect(new UserRole('waiter').canViewKitchenQueue()).toBe(false);
            });
        });
    });

    describe('equals', () => {
        test('should return true for same role', () => {
            const role1 = new UserRole('admin');
            const role2 = new UserRole('admin');
            expect(role1.equals(role2)).toBe(true);
        });

        test('should return false for different roles', () => {
            const role1 = new UserRole('admin');
            const role2 = new UserRole('waiter');
            expect(role1.equals(role2)).toBe(false);
        });

        test('should return false for non-UserRole object', () => {
            const role = new UserRole('admin');
            expect(role.equals('admin')).toBe(false);
            expect(role.equals({ value: 'admin' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('should return the role value', () => {
            const role = new UserRole('manager');
            expect(role.toString()).toBe('manager');
        });
    });
});

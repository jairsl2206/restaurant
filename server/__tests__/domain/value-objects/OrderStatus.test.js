const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('OrderStatus Value Object', () => {
    describe('constructor', () => {
        test('should create OrderStatus with valid status', () => {
            const status = new OrderStatus('CREADA');
            expect(status.value).toBe('CREADA');
        });

        test('should create OrderStatus for all valid statuses', () => {
            const statuses = ['CREADA', 'PREPARANDO', 'LISTA', 'ENTREGADA', 'CANCELADA'];
            statuses.forEach(statusValue => {
                const status = new OrderStatus(statusValue);
                expect(status.value).toBe(statusValue);
            });
        });

        test('should throw ValidationError for invalid status', () => {
            expect(() => new OrderStatus('INVALID')).toThrow(ValidationError);
            expect(() => new OrderStatus('PENDING')).toThrow(ValidationError);
        });

        test('should throw ValidationError with helpful message', () => {
            expect(() => new OrderStatus('INVALID')).toThrow('Invalid order status');
            expect(() => new OrderStatus('INVALID')).toThrow('CREADA');
            expect(() => new OrderStatus('INVALID')).toThrow('PREPARANDO');
        });

        test('should throw ValidationError for null/undefined', () => {
            expect(() => new OrderStatus(null)).toThrow(ValidationError);
            expect(() => new OrderStatus(undefined)).toThrow(ValidationError);
        });

        test('should throw ValidationError for empty string', () => {
            expect(() => new OrderStatus('')).toThrow(ValidationError);
        });

        test('should freeze the object', () => {
            const status = new OrderStatus('CREADA');
            expect(Object.isFrozen(status)).toBe(true);
        });
    });

    describe('status constants', () => {
        test('should have all status constants defined', () => {
            expect(OrderStatus.CREADA).toBe('CREADA');
            expect(OrderStatus.PREPARANDO).toBe('PREPARANDO');
            expect(OrderStatus.LISTA).toBe('LISTA');
            expect(OrderStatus.ENTREGADA).toBe('ENTREGADA');
            expect(OrderStatus.CANCELADA).toBe('CANCELADA');
        });

        test('should have ALL_STATUSES array with all statuses', () => {
            expect(OrderStatus.ALL_STATUSES).toHaveLength(5);
            expect(OrderStatus.ALL_STATUSES).toContain('CREADA');
            expect(OrderStatus.ALL_STATUSES).toContain('PREPARANDO');
            expect(OrderStatus.ALL_STATUSES).toContain('LISTA');
            expect(OrderStatus.ALL_STATUSES).toContain('ENTREGADA');
            expect(OrderStatus.ALL_STATUSES).toContain('CANCELADA');
        });
    });

    describe('status check methods', () => {
        test('isCreada should return true only for CREADA', () => {
            expect(new OrderStatus('CREADA').isCreada()).toBe(true);
            expect(new OrderStatus('PREPARANDO').isCreada()).toBe(false);
            expect(new OrderStatus('LISTA').isCreada()).toBe(false);
        });

        test('isPreparando should return true only for PREPARANDO', () => {
            expect(new OrderStatus('PREPARANDO').isPreparando()).toBe(true);
            expect(new OrderStatus('CREADA').isPreparando()).toBe(false);
            expect(new OrderStatus('LISTA').isPreparando()).toBe(false);
        });

        test('isLista should return true only for LISTA', () => {
            expect(new OrderStatus('LISTA').isLista()).toBe(true);
            expect(new OrderStatus('PREPARANDO').isLista()).toBe(false);
            expect(new OrderStatus('ENTREGADA').isLista()).toBe(false);
        });

        test('isEntregada should return true only for ENTREGADA', () => {
            expect(new OrderStatus('ENTREGADA').isEntregada()).toBe(true);
            expect(new OrderStatus('LISTA').isEntregada()).toBe(false);
            expect(new OrderStatus('CANCELADA').isEntregada()).toBe(false);
        });

        test('isCancelada should return true only for CANCELADA', () => {
            expect(new OrderStatus('CANCELADA').isCancelada()).toBe(true);
            expect(new OrderStatus('ENTREGADA').isCancelada()).toBe(false);
            expect(new OrderStatus('CREADA').isCancelada()).toBe(false);
        });
    });

    describe('isActive', () => {
        test('should return true for CREADA', () => {
            expect(new OrderStatus('CREADA').isActive()).toBe(true);
        });

        test('should return true for PREPARANDO', () => {
            expect(new OrderStatus('PREPARANDO').isActive()).toBe(true);
        });

        test('should return true for LISTA', () => {
            expect(new OrderStatus('LISTA').isActive()).toBe(true);
        });

        test('should return false for ENTREGADA', () => {
            expect(new OrderStatus('ENTREGADA').isActive()).toBe(false);
        });

        test('should return false for CANCELADA', () => {
            expect(new OrderStatus('CANCELADA').isActive()).toBe(false);
        });
    });

    describe('canTransitionTo', () => {
        describe('from CREADA', () => {
            test('should allow transition to PREPARANDO', () => {
                const status = new OrderStatus('CREADA');
                expect(status.canTransitionTo('PREPARANDO')).toBe(true);
            });

            test('should allow transition to CANCELADA', () => {
                const status = new OrderStatus('CREADA');
                expect(status.canTransitionTo('CANCELADA')).toBe(true);
            });

            test('should not allow transition to CREADA', () => {
                const status = new OrderStatus('CREADA');
                expect(status.canTransitionTo('CREADA')).toBe(false);
            });

            test('should not allow transition to LISTA or ENTREGADA', () => {
                const status = new OrderStatus('CREADA');
                expect(status.canTransitionTo('LISTA')).toBe(false);
                expect(status.canTransitionTo('ENTREGADA')).toBe(false);
            });
        });

        describe('from PREPARANDO', () => {
            test('should allow transition to LISTA', () => {
                const status = new OrderStatus('PREPARANDO');
                expect(status.canTransitionTo('LISTA')).toBe(true);
            });

            test('should allow transition to CANCELADA', () => {
                const status = new OrderStatus('PREPARANDO');
                expect(status.canTransitionTo('CANCELADA')).toBe(true);
            });

            test('should not allow transition to PREPARANDO or CREADA', () => {
                const status = new OrderStatus('PREPARANDO');
                expect(status.canTransitionTo('PREPARANDO')).toBe(false);
                expect(status.canTransitionTo('CREADA')).toBe(false);
            });
        });

        describe('from LISTA', () => {
            test('should allow transition to ENTREGADA', () => {
                const status = new OrderStatus('LISTA');
                expect(status.canTransitionTo('ENTREGADA')).toBe(true);
            });

            test('should allow transition to CANCELADA', () => {
                const status = new OrderStatus('LISTA');
                expect(status.canTransitionTo('CANCELADA')).toBe(true);
            });

            test('should not allow transition to other statuses', () => {
                const status = new OrderStatus('LISTA');
                expect(status.canTransitionTo('LISTA')).toBe(false);
                expect(status.canTransitionTo('PREPARANDO')).toBe(false);
                expect(status.canTransitionTo('CREADA')).toBe(false);
            });
        });

        describe('from ENTREGADA', () => {
            test('should not allow any transitions', () => {
                const status = new OrderStatus('ENTREGADA');
                OrderStatus.ALL_STATUSES.forEach(s => {
                    expect(status.canTransitionTo(s)).toBe(false);
                });
            });
        });

        describe('from CANCELADA', () => {
            test('should not allow any transitions', () => {
                const status = new OrderStatus('CANCELADA');
                OrderStatus.ALL_STATUSES.forEach(s => {
                    expect(status.canTransitionTo(s)).toBe(false);
                });
            });
        });
    });

    describe('TRANSITIONS constant', () => {
        test('should define transitions for all statuses', () => {
            expect(Object.keys(OrderStatus.TRANSITIONS)).toHaveLength(5);
            OrderStatus.ALL_STATUSES.forEach(status => {
                expect(OrderStatus.TRANSITIONS).toHaveProperty(status);
                expect(Array.isArray(OrderStatus.TRANSITIONS[status])).toBe(true);
            });
        });
    });

    describe('equals', () => {
        test('should return true for same status', () => {
            const status1 = new OrderStatus('CREADA');
            const status2 = new OrderStatus('CREADA');
            expect(status1.equals(status2)).toBe(true);
        });

        test('should return false for different statuses', () => {
            const status1 = new OrderStatus('CREADA');
            const status2 = new OrderStatus('PREPARANDO');
            expect(status1.equals(status2)).toBe(false);
        });

        test('should return false for non-OrderStatus object', () => {
            const status = new OrderStatus('CREADA');
            expect(status.equals('CREADA')).toBe(false);
            expect(status.equals({ value: 'CREADA' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('should return the status value', () => {
            const status = new OrderStatus('PREPARANDO');
            expect(status.toString()).toBe('PREPARANDO');
        });
    });
});

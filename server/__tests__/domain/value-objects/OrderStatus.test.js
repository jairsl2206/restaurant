const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('OrderStatus Value Object', () => {
    describe('constructor', () => {
        test('should create OrderStatus with valid status', () => {
            const status = new OrderStatus('EN_COCINA');
            expect(status.value).toBe('EN_COCINA');
        });

        test('should create OrderStatus for all valid statuses', () => {
            const statuses = ['EN_COCINA', 'LISTO_PARA_SERVIR', 'SERVIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER', 'FINALIZADO'];
            statuses.forEach(statusValue => {
                const status = new OrderStatus(statusValue);
                expect(status.value).toBe(statusValue);
            });
        });

        test('should throw ValidationError for invalid status', () => {
            expect(() => new OrderStatus('INVALID')).toThrow(ValidationError);
            expect(() => new OrderStatus('CREADA')).toThrow(ValidationError);
            expect(() => new OrderStatus('PREPARANDO')).toThrow(ValidationError);
        });

        test('should throw ValidationError with helpful message', () => {
            expect(() => new OrderStatus('INVALID')).toThrow('Invalid order status');
            expect(() => new OrderStatus('INVALID')).toThrow('EN_COCINA');
            expect(() => new OrderStatus('INVALID')).toThrow('FINALIZADO');
        });

        test('should throw ValidationError for null/undefined', () => {
            expect(() => new OrderStatus(null)).toThrow(ValidationError);
            expect(() => new OrderStatus(undefined)).toThrow(ValidationError);
        });

        test('should throw ValidationError for empty string', () => {
            expect(() => new OrderStatus('')).toThrow(ValidationError);
        });

        test('should freeze the object', () => {
            const status = new OrderStatus('EN_COCINA');
            expect(Object.isFrozen(status)).toBe(true);
        });
    });

    describe('status constants', () => {
        test('should have all status constants defined', () => {
            expect(OrderStatus.EN_COCINA).toBe('EN_COCINA');
            expect(OrderStatus.LISTO_PARA_SERVIR).toBe('LISTO_PARA_SERVIR');
            expect(OrderStatus.SERVIDO).toBe('SERVIDO');
            expect(OrderStatus.EN_REPARTO).toBe('EN_REPARTO');
            expect(OrderStatus.LISTO_PARA_RECOGER).toBe('LISTO_PARA_RECOGER');
            expect(OrderStatus.FINALIZADO).toBe('FINALIZADO');
        });

        test('should have ALL_STATUSES array with all 6 statuses', () => {
            expect(OrderStatus.ALL_STATUSES).toHaveLength(6);
            expect(OrderStatus.ALL_STATUSES).toContain('EN_COCINA');
            expect(OrderStatus.ALL_STATUSES).toContain('LISTO_PARA_SERVIR');
            expect(OrderStatus.ALL_STATUSES).toContain('SERVIDO');
            expect(OrderStatus.ALL_STATUSES).toContain('EN_REPARTO');
            expect(OrderStatus.ALL_STATUSES).toContain('LISTO_PARA_RECOGER');
            expect(OrderStatus.ALL_STATUSES).toContain('FINALIZADO');
        });
    });

    describe('status check methods', () => {
        test('isEnCocina should return true only for EN_COCINA', () => {
            expect(new OrderStatus('EN_COCINA').isEnCocina()).toBe(true);
            expect(new OrderStatus('LISTO_PARA_SERVIR').isEnCocina()).toBe(false);
            expect(new OrderStatus('FINALIZADO').isEnCocina()).toBe(false);
        });

        test('isListoParaServir should return true only for LISTO_PARA_SERVIR', () => {
            expect(new OrderStatus('LISTO_PARA_SERVIR').isListoParaServir()).toBe(true);
            expect(new OrderStatus('EN_COCINA').isListoParaServir()).toBe(false);
            expect(new OrderStatus('SERVIDO').isListoParaServir()).toBe(false);
        });

        test('isServido should return true only for SERVIDO', () => {
            expect(new OrderStatus('SERVIDO').isServido()).toBe(true);
            expect(new OrderStatus('LISTO_PARA_SERVIR').isServido()).toBe(false);
            expect(new OrderStatus('FINALIZADO').isServido()).toBe(false);
        });

        test('isEnReparto should return true only for EN_REPARTO', () => {
            expect(new OrderStatus('EN_REPARTO').isEnReparto()).toBe(true);
            expect(new OrderStatus('EN_COCINA').isEnReparto()).toBe(false);
            expect(new OrderStatus('FINALIZADO').isEnReparto()).toBe(false);
        });

        test('isListoParaRecoger should return true only for LISTO_PARA_RECOGER', () => {
            expect(new OrderStatus('LISTO_PARA_RECOGER').isListoParaRecoger()).toBe(true);
            expect(new OrderStatus('EN_COCINA').isListoParaRecoger()).toBe(false);
            expect(new OrderStatus('FINALIZADO').isListoParaRecoger()).toBe(false);
        });

        test('isFinalizado should return true only for FINALIZADO', () => {
            expect(new OrderStatus('FINALIZADO').isFinalizado()).toBe(true);
            expect(new OrderStatus('EN_COCINA').isFinalizado()).toBe(false);
            expect(new OrderStatus('SERVIDO').isFinalizado()).toBe(false);
        });
    });

    describe('isActive', () => {
        test('should return true for EN_COCINA', () => {
            expect(new OrderStatus('EN_COCINA').isActive()).toBe(true);
        });

        test('should return true for LISTO_PARA_SERVIR', () => {
            expect(new OrderStatus('LISTO_PARA_SERVIR').isActive()).toBe(true);
        });

        test('should return true for SERVIDO', () => {
            expect(new OrderStatus('SERVIDO').isActive()).toBe(true);
        });

        test('should return true for EN_REPARTO', () => {
            expect(new OrderStatus('EN_REPARTO').isActive()).toBe(true);
        });

        test('should return true for LISTO_PARA_RECOGER', () => {
            expect(new OrderStatus('LISTO_PARA_RECOGER').isActive()).toBe(true);
        });

        test('should return false for FINALIZADO', () => {
            expect(new OrderStatus('FINALIZADO').isActive()).toBe(false);
        });
    });

    describe('canTransitionTo', () => {
        describe('from EN_COCINA', () => {
            test('should allow transition to LISTO_PARA_SERVIR', () => {
                expect(new OrderStatus('EN_COCINA').canTransitionTo('LISTO_PARA_SERVIR')).toBe(true);
            });

            test('should allow transition to EN_REPARTO', () => {
                expect(new OrderStatus('EN_COCINA').canTransitionTo('EN_REPARTO')).toBe(true);
            });

            test('should allow transition to LISTO_PARA_RECOGER', () => {
                expect(new OrderStatus('EN_COCINA').canTransitionTo('LISTO_PARA_RECOGER')).toBe(true);
            });

            test('should not allow transition to SERVIDO or FINALIZADO directly', () => {
                expect(new OrderStatus('EN_COCINA').canTransitionTo('SERVIDO')).toBe(false);
                expect(new OrderStatus('EN_COCINA').canTransitionTo('FINALIZADO')).toBe(false);
                expect(new OrderStatus('EN_COCINA').canTransitionTo('EN_COCINA')).toBe(false);
            });
        });

        describe('from LISTO_PARA_SERVIR', () => {
            test('should allow transition to SERVIDO', () => {
                expect(new OrderStatus('LISTO_PARA_SERVIR').canTransitionTo('SERVIDO')).toBe(true);
            });

            test('should allow transition to FINALIZADO', () => {
                expect(new OrderStatus('LISTO_PARA_SERVIR').canTransitionTo('FINALIZADO')).toBe(true);
            });

            test('should not allow transition back to EN_COCINA', () => {
                expect(new OrderStatus('LISTO_PARA_SERVIR').canTransitionTo('EN_COCINA')).toBe(false);
                expect(new OrderStatus('LISTO_PARA_SERVIR').canTransitionTo('EN_REPARTO')).toBe(false);
            });
        });

        describe('from SERVIDO', () => {
            test('should allow transition to FINALIZADO only', () => {
                expect(new OrderStatus('SERVIDO').canTransitionTo('FINALIZADO')).toBe(true);
                expect(new OrderStatus('SERVIDO').canTransitionTo('EN_COCINA')).toBe(false);
                expect(new OrderStatus('SERVIDO').canTransitionTo('LISTO_PARA_SERVIR')).toBe(false);
            });
        });

        describe('from EN_REPARTO', () => {
            test('should allow transition to FINALIZADO only', () => {
                expect(new OrderStatus('EN_REPARTO').canTransitionTo('FINALIZADO')).toBe(true);
                expect(new OrderStatus('EN_REPARTO').canTransitionTo('EN_COCINA')).toBe(false);
                expect(new OrderStatus('EN_REPARTO').canTransitionTo('LISTO_PARA_RECOGER')).toBe(false);
            });
        });

        describe('from LISTO_PARA_RECOGER', () => {
            test('should allow transition to FINALIZADO only', () => {
                expect(new OrderStatus('LISTO_PARA_RECOGER').canTransitionTo('FINALIZADO')).toBe(true);
                expect(new OrderStatus('LISTO_PARA_RECOGER').canTransitionTo('EN_COCINA')).toBe(false);
                expect(new OrderStatus('LISTO_PARA_RECOGER').canTransitionTo('SERVIDO')).toBe(false);
            });
        });

        describe('from FINALIZADO', () => {
            test('should not allow any transitions', () => {
                const status = new OrderStatus('FINALIZADO');
                OrderStatus.ALL_STATUSES.forEach(s => {
                    expect(status.canTransitionTo(s)).toBe(false);
                });
            });
        });
    });

    describe('TRANSITIONS constant', () => {
        test('should define transitions for all statuses', () => {
            expect(Object.keys(OrderStatus.TRANSITIONS)).toHaveLength(6);
            OrderStatus.ALL_STATUSES.forEach(status => {
                expect(OrderStatus.TRANSITIONS).toHaveProperty(status);
                expect(Array.isArray(OrderStatus.TRANSITIONS[status])).toBe(true);
            });
        });
    });

    describe('equals', () => {
        test('should return true for same status', () => {
            const status1 = new OrderStatus('EN_COCINA');
            const status2 = new OrderStatus('EN_COCINA');
            expect(status1.equals(status2)).toBe(true);
        });

        test('should return false for different statuses', () => {
            const status1 = new OrderStatus('EN_COCINA');
            const status2 = new OrderStatus('FINALIZADO');
            expect(status1.equals(status2)).toBe(false);
        });

        test('should return false for non-OrderStatus object', () => {
            const status = new OrderStatus('EN_COCINA');
            expect(status.equals('EN_COCINA')).toBe(false);
            expect(status.equals({ value: 'EN_COCINA' })).toBe(false);
        });
    });

    describe('toString', () => {
        test('should return the status value', () => {
            const status = new OrderStatus('LISTO_PARA_SERVIR');
            expect(status.toString()).toBe('LISTO_PARA_SERVIR');
        });
    });
});

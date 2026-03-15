const Order = require('../../../src/domain/entities/Order');
const OrderItem = require('../../../src/domain/entities/OrderItem');
const OrderStatus = require('../../../src/domain/value-objects/OrderStatus');
const Money = require('../../../src/domain/value-objects/Money');
const { ValidationError } = require('../../../src/shared/errors/errorTypes');

describe('Order Entity', () => {
    const createValidOrderData = (overrides = {}) => ({
        id: 1,
        branchId: 1,
        customerId: 100,
        waiterId: 50,
        tableNumber: 5,
        type: 'DINE_IN',
        status: 'EN_COCINA',
        items: [
            { itemName: 'Burger', quantity: 2, unitPrice: 100 },
            { itemName: 'Drink', quantity: 1, unitPrice: 50 }
        ],
        discountTotal: 10,
        taxTotal: 5,
        notes: 'No onions',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides
    });

    describe('constructor', () => {
        test('should create Order with valid data', () => {
            const data = createValidOrderData();
            const order = new Order(data);

            expect(order.id).toBe(1);
            expect(order.branchId).toBe(1);
            expect(order.customerId).toBe(100);
            expect(order.waiterId).toBe(50);
            expect(order.tableNumber).toBe(5);
            expect(order.type).toBe('DINE_IN');
            expect(order.discountTotal).toBe(10);
            expect(order.taxTotal).toBe(5);
            expect(order.notes).toBe('No onions');
        });

        test('should convert status to OrderStatus object', () => {
            const data = createValidOrderData();
            const order = new Order(data);
            expect(order.status).toBeInstanceOf(OrderStatus);
            expect(order.status.value).toBe('EN_COCINA');
        });

        test('should accept OrderStatus object directly', () => {
            const data = createValidOrderData({ status: new OrderStatus('LISTO_PARA_SERVIR') });
            const order = new Order(data);
            expect(order.status.value).toBe('LISTO_PARA_SERVIR');
        });

        test('should convert items to OrderItem objects', () => {
            const data = createValidOrderData();
            const order = new Order(data);
            expect(order.items).toHaveLength(2);
            expect(order.items[0]).toBeInstanceOf(OrderItem);
            expect(order.items[1]).toBeInstanceOf(OrderItem);
        });

        test('should accept OrderItem objects directly', () => {
            const items = [
                new OrderItem({ itemName: 'Pizza', quantity: 1, unitPrice: 200 })
            ];
            const data = createValidOrderData({ items });
            const order = new Order(data);
            expect(order.items[0]).toBeInstanceOf(OrderItem);
        });

        test('should use default values for optional fields', () => {
            const data = {
                id: 1,
                branchId: 1,
                status: 'EN_COCINA',
                items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }]
            };
            const order = new Order(data);
            expect(order.customerId).toBeNull();
            expect(order.waiterId).toBeNull();
            expect(order.tableNumber).toBeNull();
            expect(order.type).toBe('DINE_IN');
            expect(order.discountTotal).toBe(0);
            expect(order.taxTotal).toBe(0);
            expect(order.notes).toBeNull();
            expect(order.createdAt).toBeInstanceOf(Date);
            expect(order.updatedAt).toBeInstanceOf(Date);
        });

        test('should throw ValidationError for empty items array', () => {
            const data = createValidOrderData({ items: [] });
            expect(() => new Order(data)).toThrow(ValidationError);
            expect(() => new Order(data)).toThrow('Order must have at least one item');
        });

        test('should throw ValidationError for null items', () => {
            const data = createValidOrderData({ items: null });
            expect(() => new Order(data)).toThrow(ValidationError);
        });

        test('should throw ValidationError for non-array items', () => {
            const data = createValidOrderData({ items: 'not an array' });
            expect(() => new Order(data)).toThrow(ValidationError);
        });

        test('should throw ValidationError for invalid status', () => {
            const data = createValidOrderData({ status: 'INVALID' });
            expect(() => new Order(data)).toThrow(ValidationError);
        });
    });

    describe('subtotal', () => {
        test('should calculate subtotal from items', () => {
            const data = createValidOrderData({
                items: [
                    { itemName: 'Burger', quantity: 2, unitPrice: 100 },
                    { itemName: 'Drink', quantity: 1, unitPrice: 50 }
                ]
            });
            const order = new Order(data);
            // Burger: 2 * 100 = 200, Drink: 1 * 50 = 50, Total = 250
            expect(order.subtotal).toBeInstanceOf(Money);
            expect(order.subtotal.amount).toBe(250);
        });

        test('should include item discounts in subtotal', () => {
            const data = createValidOrderData({
                items: [
                    { itemName: 'Burger', quantity: 2, unitPrice: 100, discountAmount: 20 },
                    { itemName: 'Drink', quantity: 1, unitPrice: 50 }
                ]
            });
            const order = new Order(data);
            // Burger: 200 - 20 = 180, Drink: 50, Total = 230
            expect(order.subtotal.amount).toBe(230);
        });

        test('should return zero for items with zero price', () => {
            const data = createValidOrderData({
                items: [
                    { itemName: 'Free Item', quantity: 5, unitPrice: 0 }
                ]
            });
            const order = new Order(data);
            expect(order.subtotal.amount).toBe(0);
        });
    });

    describe('total', () => {
        test('should calculate total with subtotal, discount, and tax', () => {
            const data = createValidOrderData({
                items: [{ itemName: 'Item', quantity: 1, unitPrice: 100 }],
                discountTotal: 10,
                taxTotal: 16
            });
            const order = new Order(data);
            // 100 - 10 + 16 = 106
            expect(order.total).toBeInstanceOf(Money);
            expect(order.total.amount).toBe(106);
        });

        test('should not go below zero', () => {
            const data = createValidOrderData({
                items: [{ itemName: 'Item', quantity: 1, unitPrice: 10 }],
                discountTotal: 100,
                taxTotal: 0
            });
            const order = new Order(data);
            expect(order.total.amount).toBe(0);
        });

        test('should calculate correctly with only subtotal', () => {
            const data = createValidOrderData({
                items: [{ itemName: 'Item', quantity: 2, unitPrice: 50 }],
                discountTotal: 0,
                taxTotal: 0
            });
            const order = new Order(data);
            expect(order.total.amount).toBe(100);
        });
    });

    describe('business rule methods', () => {
        test('canBeEdited should return true for all active states', () => {
            const activeStatuses = ['EN_COCINA', 'LISTO_PARA_SERVIR', 'SERVIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER'];
            activeStatuses.forEach(status => {
                const order = new Order(createValidOrderData({ status }));
                expect(order.canBeEdited()).toBe(true);
            });
        });

        test('canBeEdited should return false only for FINALIZADO', () => {
            const orderFinalizado = new Order(createValidOrderData({ status: 'FINALIZADO' }));
            expect(orderFinalizado.canBeEdited()).toBe(false);
        });

        test('canBeServed should return true for LISTO_PARA_SERVIR', () => {
            const orderListo = new Order(createValidOrderData({ status: 'LISTO_PARA_SERVIR' }));
            const orderEnCocina = new Order(createValidOrderData({ status: 'EN_COCINA' }));

            expect(orderListo.canBeServed()).toBe(true);
            expect(orderEnCocina.canBeServed()).toBe(false);
        });

        test('canBeFinalizado should return true for ready-to-finalize statuses', () => {
            const orderServido = new Order(createValidOrderData({ status: 'SERVIDO' }));
            const orderEnReparto = new Order(createValidOrderData({ status: 'EN_REPARTO' }));
            const orderRecoger = new Order(createValidOrderData({ status: 'LISTO_PARA_RECOGER' }));
            const orderEnCocina = new Order(createValidOrderData({ status: 'EN_COCINA' }));

            expect(orderServido.canBeFinalizado()).toBe(true);
            expect(orderEnReparto.canBeFinalizado()).toBe(true);
            expect(orderRecoger.canBeFinalizado()).toBe(true);
            expect(orderEnCocina.canBeFinalizado()).toBe(false);
        });
    });

    describe('type check methods', () => {
        test('isDineIn should return true only for DINE_IN', () => {
            const orderDineIn = new Order(createValidOrderData({ type: 'DINE_IN' }));
            const orderDelivery = new Order(createValidOrderData({ type: 'DELIVERY' }));

            expect(orderDineIn.isDineIn()).toBe(true);
            expect(orderDelivery.isDineIn()).toBe(false);
        });

        test('isDelivery should return true only for DELIVERY', () => {
            const orderDelivery = new Order(createValidOrderData({ type: 'DELIVERY' }));
            const orderDineIn = new Order(createValidOrderData({ type: 'DINE_IN' }));

            expect(orderDelivery.isDelivery()).toBe(true);
            expect(orderDineIn.isDelivery()).toBe(false);
        });

        test('isPickup should return true only for PICKUP', () => {
            const orderPickup = new Order(createValidOrderData({ type: 'PICKUP' }));
            const orderDineIn = new Order(createValidOrderData({ type: 'DINE_IN' }));

            expect(orderPickup.isPickup()).toBe(true);
            expect(orderDineIn.isPickup()).toBe(false);
        });
    });

    describe('updateStatus', () => {
        test('should return new Order with updated status', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const updated = order.updateStatus('LISTO_PARA_SERVIR');
            expect(updated.status.value).toBe('LISTO_PARA_SERVIR');
        });

        test('should preserve other properties', () => {
            const order = new Order(createValidOrderData());
            const updated = order.updateStatus('LISTO_PARA_SERVIR');
            expect(updated.id).toBe(order.id);
            expect(updated.branchId).toBe(order.branchId);
            expect(updated.items).toHaveLength(order.items.length);
        });

        test('should return new instance (immutable)', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const updated = order.updateStatus('LISTO_PARA_SERVIR');
            expect(updated).not.toBe(order);
            expect(order.status.value).toBe('EN_COCINA');
        });

        test('should update updatedAt timestamp', () => {
            const oldDate = new Date('2024-01-01');
            const order = new Order(createValidOrderData({ createdAt: oldDate, updatedAt: oldDate }));
            const updated = order.updateStatus('LISTO_PARA_SERVIR');
            expect(updated.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
        });

        test('should throw ValidationError for invalid transition', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            expect(() => order.updateStatus('FINALIZADO')).toThrow(ValidationError);
            expect(() => order.updateStatus('FINALIZADO')).toThrow('Cannot transition from EN_COCINA to FINALIZADO');
        });

        test('should accept string status', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const updated = order.updateStatus('EN_REPARTO');
            expect(updated.status.value).toBe('EN_REPARTO');
        });

        test('should accept OrderStatus object', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const updated = order.updateStatus(new OrderStatus('LISTO_PARA_SERVIR'));
            expect(updated.status.value).toBe('LISTO_PARA_SERVIR');
        });
    });

    describe('updateItems', () => {
        test('should return new Order with updated items', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            const updated = order.updateItems(newItems);
            expect(updated.items).toHaveLength(1);
            expect(updated.items[0].itemName).toBe('New Item');
        });

        test('should preserve other properties', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            const updated = order.updateItems(newItems);
            expect(updated.id).toBe(order.id);
            expect(updated.status.value).toBe(order.status.value);
        });

        test('should allow editing in all active states', () => {
            const activeStatuses = ['EN_COCINA', 'LISTO_PARA_SERVIR', 'SERVIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER'];
            activeStatuses.forEach(status => {
                const order = new Order(createValidOrderData({ status }));
                const updated = order.updateItems([{ itemName: 'New Item', quantity: 1, unitPrice: 200 }]);
                expect(updated.items[0].itemName).toBe('New Item');
            });
        });

        test('should throw ValidationError when order is FINALIZADO', () => {
            const order = new Order(createValidOrderData({ status: 'FINALIZADO' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            expect(() => order.updateItems(newItems)).toThrow(ValidationError);
            expect(() => order.updateItems(newItems)).toThrow('Cannot edit a finalized order');
        });

        test('should throw ValidationError for empty items', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            expect(() => order.updateItems([])).toThrow(ValidationError);
        });

        test('should update updatedAt timestamp', () => {
            const oldDate = new Date('2024-01-01');
            const order = new Order(createValidOrderData({ status: 'EN_COCINA', updatedAt: oldDate }));
            const updated = order.updateItems([{ itemName: 'Item', quantity: 1, unitPrice: 100 }]);
            expect(updated.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
        });
    });

    describe('addItem', () => {
        test('should add item to order', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const newItem = { itemName: 'Dessert', quantity: 1, unitPrice: 80 };
            const updated = order.addItem(newItem);
            expect(updated.items).toHaveLength(3);
            expect(updated.items[2].itemName).toBe('Dessert');
        });

        test('should accept OrderItem object', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const newItem = new OrderItem({ itemName: 'Dessert', quantity: 1, unitPrice: 80 });
            const updated = order.addItem(newItem);
            expect(updated.items[2]).toBeInstanceOf(OrderItem);
        });

        test('should return new instance (immutable)', () => {
            const order = new Order(createValidOrderData({ status: 'EN_COCINA' }));
            const updated = order.addItem({ itemName: 'Item', quantity: 1, unitPrice: 100 });
            expect(updated).not.toBe(order);
            expect(order.items).toHaveLength(2);
        });
    });

    describe('removeItem', () => {
        test('should remove item by id', () => {
            const items = [
                { id: 1, itemName: 'Item 1', quantity: 1, unitPrice: 100 },
                { id: 2, itemName: 'Item 2', quantity: 1, unitPrice: 200 }
            ];
            const order = new Order(createValidOrderData({ items, status: 'EN_COCINA' }));
            const updated = order.removeItem(1);
            expect(updated.items).toHaveLength(1);
            expect(updated.items[0].id).toBe(2);
        });

        test('should throw ValidationError when removing last item', () => {
            const items = [{ id: 1, itemName: 'Only Item', quantity: 1, unitPrice: 100 }];
            const order = new Order(createValidOrderData({ items, status: 'EN_COCINA' }));
            expect(() => order.removeItem(1)).toThrow(ValidationError);
            expect(() => order.removeItem(1)).toThrow('Order must have at least one item');
        });

        test('should return new instance (immutable)', () => {
            const items = [
                { id: 1, itemName: 'Item 1', quantity: 1, unitPrice: 100 },
                { id: 2, itemName: 'Item 2', quantity: 1, unitPrice: 200 }
            ];
            const order = new Order(createValidOrderData({ items, status: 'EN_COCINA' }));
            const updated = order.removeItem(1);
            expect(updated).not.toBe(order);
            expect(order.items).toHaveLength(2);
        });
    });

    describe('toJSON', () => {
        test('should return serialized order object', () => {
            const order = new Order(createValidOrderData());
            const json = order.toJSON();

            expect(json.id).toBe(1);
            expect(json.branchId).toBe(1);
            expect(json.customerId).toBe(100);
            expect(json.status).toBe('EN_COCINA');
            expect(json.type).toBe('DINE_IN');
            expect(json.discountTotal).toBe(10);
            expect(json.taxTotal).toBe(5);
            expect(json.notes).toBe('No onions');
            expect(Array.isArray(json.items)).toBe(true);
        });

        test('should serialize status as string', () => {
            const order = new Order(createValidOrderData());
            const json = order.toJSON();
            expect(typeof json.status).toBe('string');
            expect(json.status).toBe('EN_COCINA');
        });

        test('should serialize monetary values as numbers', () => {
            const order = new Order(createValidOrderData());
            const json = order.toJSON();
            expect(typeof json.subtotal).toBe('number');
            expect(typeof json.total).toBe('number');
        });

        test('should serialize items', () => {
            const order = new Order(createValidOrderData());
            const json = order.toJSON();
            expect(json.items).toHaveLength(2);
            expect(json.items[0]).toHaveProperty('itemName');
            expect(json.items[0]).toHaveProperty('quantity');
        });
    });
});

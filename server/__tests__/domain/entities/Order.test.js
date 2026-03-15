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
        status: 'CREADA',
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
            expect(order.status.value).toBe('CREADA');
        });

        test('should accept OrderStatus object directly', () => {
            const data = createValidOrderData({ status: new OrderStatus('PREPARANDO') });
            const order = new Order(data);
            expect(order.status.value).toBe('PREPARANDO');
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
                status: 'CREADA',
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
        test('canBeEdited should return true only for CREADA', () => {
            const orderCreada = new Order(createValidOrderData({ status: 'CREADA' }));
            const orderPreparando = new Order(createValidOrderData({ status: 'PREPARANDO' }));
            const orderLista = new Order(createValidOrderData({ status: 'LISTA' }));
            const orderEntregada = new Order(createValidOrderData({ status: 'ENTREGADA' }));

            expect(orderCreada.canBeEdited()).toBe(true);
            expect(orderPreparando.canBeEdited()).toBe(false);
            expect(orderLista.canBeEdited()).toBe(false);
            expect(orderEntregada.canBeEdited()).toBe(false);
        });

        test('canBePrepared should return true only for CREADA', () => {
            const orderCreada = new Order(createValidOrderData({ status: 'CREADA' }));
            const orderPreparando = new Order(createValidOrderData({ status: 'PREPARANDO' }));

            expect(orderCreada.canBePrepared()).toBe(true);
            expect(orderPreparando.canBePrepared()).toBe(false);
        });

        test('canBeMarkedReady should return true only for PREPARANDO', () => {
            const orderPreparando = new Order(createValidOrderData({ status: 'PREPARANDO' }));
            const orderCreada = new Order(createValidOrderData({ status: 'CREADA' }));

            expect(orderPreparando.canBeMarkedReady()).toBe(true);
            expect(orderCreada.canBeMarkedReady()).toBe(false);
        });

        test('canBeDelivered should return true only for LISTA', () => {
            const orderLista = new Order(createValidOrderData({ status: 'LISTA' }));
            const orderPreparando = new Order(createValidOrderData({ status: 'PREPARANDO' }));

            expect(orderLista.canBeDelivered()).toBe(true);
            expect(orderPreparando.canBeDelivered()).toBe(false);
        });

        test('canBeCancelled should return true for active statuses', () => {
            const orderCreada = new Order(createValidOrderData({ status: 'CREADA' }));
            const orderPreparando = new Order(createValidOrderData({ status: 'PREPARANDO' }));
            const orderLista = new Order(createValidOrderData({ status: 'LISTA' }));
            const orderEntregada = new Order(createValidOrderData({ status: 'ENTREGADA' }));

            expect(orderCreada.canBeCancelled()).toBe(true);
            expect(orderPreparando.canBeCancelled()).toBe(true);
            expect(orderLista.canBeCancelled()).toBe(true);
            expect(orderEntregada.canBeCancelled()).toBe(false);
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
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const updated = order.updateStatus('PREPARANDO');
            expect(updated.status.value).toBe('PREPARANDO');
        });

        test('should preserve other properties', () => {
            const order = new Order(createValidOrderData());
            const updated = order.updateStatus('PREPARANDO');
            expect(updated.id).toBe(order.id);
            expect(updated.branchId).toBe(order.branchId);
            expect(updated.items).toHaveLength(order.items.length);
        });

        test('should return new instance (immutable)', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const updated = order.updateStatus('PREPARANDO');
            expect(updated).not.toBe(order);
            expect(order.status.value).toBe('CREADA');
        });

        test('should update updatedAt timestamp', () => {
            const oldDate = new Date('2024-01-01');
            const order = new Order(createValidOrderData({ createdAt: oldDate, updatedAt: oldDate }));
            const updated = order.updateStatus('PREPARANDO');
            expect(updated.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
        });

        test('should throw ValidationError for invalid transition', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            expect(() => order.updateStatus('ENTREGADA')).toThrow(ValidationError);
            expect(() => order.updateStatus('ENTREGADA')).toThrow('Cannot transition from CREADA to ENTREGADA');
        });

        test('should accept string status', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const updated = order.updateStatus('CANCELADA');
            expect(updated.status.value).toBe('CANCELADA');
        });

        test('should accept OrderStatus object', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const updated = order.updateStatus(new OrderStatus('PREPARANDO'));
            expect(updated.status.value).toBe('PREPARANDO');
        });
    });

    describe('updateItems', () => {
        test('should return new Order with updated items', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            const updated = order.updateItems(newItems);
            expect(updated.items).toHaveLength(1);
            expect(updated.items[0].itemName).toBe('New Item');
        });

        test('should preserve other properties', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            const updated = order.updateItems(newItems);
            expect(updated.id).toBe(order.id);
            expect(updated.status.value).toBe(order.status.value);
        });

        test('should throw ValidationError when order cannot be edited', () => {
            const order = new Order(createValidOrderData({ status: 'PREPARANDO' }));
            const newItems = [{ itemName: 'New Item', quantity: 1, unitPrice: 200 }];
            expect(() => order.updateItems(newItems)).toThrow(ValidationError);
            expect(() => order.updateItems(newItems)).toThrow('Cannot edit an order that is not in CREADA status');
        });

        test('should throw ValidationError for empty items', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            expect(() => order.updateItems([])).toThrow(ValidationError);
        });

        test('should update updatedAt timestamp', () => {
            const oldDate = new Date('2024-01-01');
            const order = new Order(createValidOrderData({ status: 'CREADA', updatedAt: oldDate }));
            const updated = order.updateItems([{ itemName: 'Item', quantity: 1, unitPrice: 100 }]);
            expect(updated.updatedAt.getTime()).toBeGreaterThan(oldDate.getTime());
        });
    });

    describe('addItem', () => {
        test('should add item to order', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const newItem = { itemName: 'Dessert', quantity: 1, unitPrice: 80 };
            const updated = order.addItem(newItem);
            expect(updated.items).toHaveLength(3);
            expect(updated.items[2].itemName).toBe('Dessert');
        });

        test('should accept OrderItem object', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
            const newItem = new OrderItem({ itemName: 'Dessert', quantity: 1, unitPrice: 80 });
            const updated = order.addItem(newItem);
            expect(updated.items[2]).toBeInstanceOf(OrderItem);
        });

        test('should return new instance (immutable)', () => {
            const order = new Order(createValidOrderData({ status: 'CREADA' }));
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
            const order = new Order(createValidOrderData({ items, status: 'CREADA' }));
            const updated = order.removeItem(1);
            expect(updated.items).toHaveLength(1);
            expect(updated.items[0].id).toBe(2);
        });

        test('should throw ValidationError when removing last item', () => {
            const items = [{ id: 1, itemName: 'Only Item', quantity: 1, unitPrice: 100 }];
            const order = new Order(createValidOrderData({ items, status: 'CREADA' }));
            expect(() => order.removeItem(1)).toThrow(ValidationError);
            expect(() => order.removeItem(1)).toThrow('Order must have at least one item');
        });

        test('should return new instance (immutable)', () => {
            const items = [
                { id: 1, itemName: 'Item 1', quantity: 1, unitPrice: 100 },
                { id: 2, itemName: 'Item 2', quantity: 1, unitPrice: 200 }
            ];
            const order = new Order(createValidOrderData({ items, status: 'CREADA' }));
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
            expect(json.status).toBe('CREADA');
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
            expect(json.status).toBe('CREADA');
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

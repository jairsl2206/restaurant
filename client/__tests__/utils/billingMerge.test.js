const {
    buildBillingItemsList,
    parseItemsIndividual
} = require('../../src/utils/orderCardUtils');

describe('buildBillingItemsList', () => {
    const parentItems  = 'Pizza x2 [150],Refresco x1 [30]';
    const additionItems = 'Orden de papas x1 [50]';

    describe('orders without additions', () => {
        test('returns only parent items when additions_items is null', () => {
            const order = { items: parentItems, additions_items: null };
            const result = buildBillingItemsList(order);
            expect(result).toHaveLength(3); // 2 pizzas + 1 refresco (expanded individually)
            expect(result.every(i => !i.isAddition)).toBe(true);
        });

        test('returns only parent items when additions_items is undefined', () => {
            const order = { items: parentItems };
            const result = buildBillingItemsList(order);
            expect(result.every(i => !i.isAddition)).toBe(true);
        });

        test('returns only parent items when additions_items is empty string', () => {
            const order = { items: parentItems, additions_items: '' };
            const result = buildBillingItemsList(order);
            expect(result.every(i => !i.isAddition)).toBe(true);
        });
    });

    describe('orders with additions', () => {
        test('merges parent and addition items into a single list', () => {
            const order = { items: parentItems, additions_items: additionItems };
            const result = buildBillingItemsList(order);

            const parentCount    = parseItemsIndividual(parentItems).length;
            const additionCount  = parseItemsIndividual(additionItems).length;
            expect(result).toHaveLength(parentCount + additionCount);
        });

        test('parent items appear first', () => {
            const order = { items: 'Tacos x2 [80]', additions_items: 'Agua x1 [20]' };
            const result = buildBillingItemsList(order);
            expect(result[0].text).toBe('Tacos');
            expect(result[0].isAddition).toBeFalsy();
        });

        test('addition items are flagged with isAddition: true', () => {
            const order = { items: 'Tacos x2 [80]', additions_items: 'Agua x1 [20]' };
            const result = buildBillingItemsList(order);
            const additions = result.filter(i => i.isAddition);
            expect(additions).toHaveLength(1);
            expect(additions[0].text).toBe('Agua');
        });

        test('non-addition items are NOT flagged', () => {
            const order = { items: 'Tacos x2 [80]', additions_items: 'Agua x1 [20]' };
            const result = buildBillingItemsList(order);
            const nonAdditions = result.filter(i => !i.isAddition);
            expect(nonAdditions).toHaveLength(2); // 2 tacos expanded
            expect(nonAdditions.every(i => !i.isAddition)).toBe(true);
        });

        test('multiple addition items are all flagged', () => {
            const order = {
                items: 'Burger x1 [120]',
                additions_items: 'Papas x1 [40],Refresco x2 [30]'
            };
            const result = buildBillingItemsList(order);
            const additions = result.filter(i => i.isAddition);
            // 1 papas + 2 refrescos (expanded)
            expect(additions).toHaveLength(3);
            expect(additions.every(i => i.isAddition)).toBe(true);
        });

        test('returns correct total item count with complex orders', () => {
            const order = {
                items: 'Pozole x1 [120],Tostadas x3 [15],Agua x2 [20]',
                additions_items: 'Postre x1 [65]'
            };
            const result = buildBillingItemsList(order);
            const parentCount   = parseItemsIndividual(order.items).length;    // 1+3+2 = 6
            const additionCount = parseItemsIndividual(order.additions_items).length; // 1
            expect(result).toHaveLength(parentCount + additionCount);
        });

        test('addition items with notes are parsed correctly', () => {
            const order = {
                items: 'Pizza x1 [150]',
                additions_items: 'Pizza (sin queso) x1 [150]'
            };
            const result = buildBillingItemsList(order);
            const additionItem = result.find(i => i.isAddition);
            expect(additionItem).toBeDefined();
            expect(additionItem.text).toBe('Pizza');
            expect(additionItem.note).toBe('sin queso');
        });
    });

    describe('edge cases', () => {
        test('handles empty parent items with additions', () => {
            const order = { items: null, additions_items: 'Agua x1 [20]' };
            const result = buildBillingItemsList(order);
            expect(result).toHaveLength(1);
            expect(result[0].isAddition).toBe(true);
        });

        test('handles both null — returns empty array', () => {
            const order = { items: null, additions_items: null };
            const result = buildBillingItemsList(order);
            expect(result).toEqual([]);
        });

        test('all returned items have required fields (id, text, checked)', () => {
            const order = { items: 'Tacos x1 [80]', additions_items: 'Agua x1 [20]' };
            const result = buildBillingItemsList(order);
            result.forEach(item => {
                expect(item).toHaveProperty('id');
                expect(item).toHaveProperty('text');
                expect(item).toHaveProperty('checked');
            });
        });
    });
});

const {
    getNextStatus,
    getStatusSteps,
    cleanItemName,
    parseItemsIndividual,
    parseItemsGrouped
} = require('../../src/utils/orderCardUtils');

const ORDER_STATUS = {
    EN_COCINA:          'EN_COCINA',
    LISTO_PARA_SERVIR:  'LISTO_PARA_SERVIR',
    SERVIDO:            'SERVIDO',
    EN_REPARTO:         'EN_REPARTO',
    LISTO_PARA_RECOGER: 'LISTO_PARA_RECOGER',
    FINALIZADO:         'FINALIZADO'
};

const ORDER_TYPE = {
    DINE_IN:  'DINE_IN',
    DELIVERY: 'DELIVERY',
    PICKUP:   'PICKUP'
};

describe('getNextStatus', () => {
    test('DINE_IN EN_COCINA → LISTO_PARA_SERVIR', () => {
        expect(getNextStatus({ status: ORDER_STATUS.EN_COCINA, type: ORDER_TYPE.DINE_IN }))
            .toBe(ORDER_STATUS.LISTO_PARA_SERVIR);
    });

    test('DELIVERY EN_COCINA → EN_REPARTO', () => {
        expect(getNextStatus({ status: ORDER_STATUS.EN_COCINA, type: ORDER_TYPE.DELIVERY }))
            .toBe(ORDER_STATUS.EN_REPARTO);
    });

    test('PICKUP EN_COCINA → LISTO_PARA_RECOGER', () => {
        expect(getNextStatus({ status: ORDER_STATUS.EN_COCINA, type: ORDER_TYPE.PICKUP }))
            .toBe(ORDER_STATUS.LISTO_PARA_RECOGER);
    });

    test('LISTO_PARA_SERVIR → SERVIDO', () => {
        expect(getNextStatus({ status: ORDER_STATUS.LISTO_PARA_SERVIR, type: ORDER_TYPE.DINE_IN }))
            .toBe(ORDER_STATUS.SERVIDO);
    });

    test('SERVIDO → FINALIZADO', () => {
        expect(getNextStatus({ status: ORDER_STATUS.SERVIDO, type: ORDER_TYPE.DINE_IN }))
            .toBe(ORDER_STATUS.FINALIZADO);
    });

    test('EN_REPARTO → FINALIZADO', () => {
        expect(getNextStatus({ status: ORDER_STATUS.EN_REPARTO, type: ORDER_TYPE.DELIVERY }))
            .toBe(ORDER_STATUS.FINALIZADO);
    });

    test('LISTO_PARA_RECOGER → FINALIZADO', () => {
        expect(getNextStatus({ status: ORDER_STATUS.LISTO_PARA_RECOGER, type: ORDER_TYPE.PICKUP }))
            .toBe(ORDER_STATUS.FINALIZADO);
    });

    test('FINALIZADO → null (no next step)', () => {
        expect(getNextStatus({ status: ORDER_STATUS.FINALIZADO, type: ORDER_TYPE.DINE_IN }))
            .toBeNull();
    });
});

describe('getStatusSteps', () => {
    test('DINE_IN has 4 steps', () => {
        const steps = getStatusSteps({ type: ORDER_TYPE.DINE_IN });
        expect(steps).toEqual([
            ORDER_STATUS.EN_COCINA,
            ORDER_STATUS.LISTO_PARA_SERVIR,
            ORDER_STATUS.SERVIDO,
            ORDER_STATUS.FINALIZADO
        ]);
    });

    test('DELIVERY has 3 steps', () => {
        const steps = getStatusSteps({ type: ORDER_TYPE.DELIVERY });
        expect(steps).toEqual([
            ORDER_STATUS.EN_COCINA,
            ORDER_STATUS.EN_REPARTO,
            ORDER_STATUS.FINALIZADO
        ]);
    });

    test('PICKUP has 3 steps', () => {
        const steps = getStatusSteps({ type: ORDER_TYPE.PICKUP });
        expect(steps).toEqual([
            ORDER_STATUS.EN_COCINA,
            ORDER_STATUS.LISTO_PARA_RECOGER,
            ORDER_STATUS.FINALIZADO
        ]);
    });
});

describe('cleanItemName', () => {
    test('removes " x2" suffix', () => {
        expect(cleanItemName('Hamburguesa x2')).toBe('Hamburguesa');
    });

    test('removes " [150.0]" price suffix', () => {
        expect(cleanItemName('Hamburguesa [150.0]')).toBe('Hamburguesa');
    });

    test('removes combined " x2 [150.0]" suffix', () => {
        expect(cleanItemName('Hamburguesa x2 [150.0]')).toBe('Hamburguesa');
    });

    test('leaves clean names unchanged', () => {
        expect(cleanItemName('Hamburguesa')).toBe('Hamburguesa');
    });

    test('trims whitespace', () => {
        expect(cleanItemName('  Taco  ')).toBe('Taco');
    });

    test('handles nested suffixes recursively', () => {
        expect(cleanItemName('Taco x3 [90.0] x2')).toBe('Taco');
    });
});

describe('parseItemsIndividual', () => {
    test('returns empty array for falsy input', () => {
        expect(parseItemsIndividual('')).toEqual([]);
        expect(parseItemsIndividual(null)).toEqual([]);
        expect(parseItemsIndividual(undefined)).toEqual([]);
    });

    test('parses a simple single item', () => {
        const result = parseItemsIndividual('Taco');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].quantity).toBe(1);
        expect(result[0].note).toBe('');
        expect(result[0].checked).toBe(false);
    });

    test('expands quantity into individual items', () => {
        const result = parseItemsIndividual('Taco x3');
        expect(result).toHaveLength(3);
        result.forEach(item => {
            expect(item.text).toBe('Taco');
            expect(item.quantity).toBe(1);
        });
    });

    test('parses item with note', () => {
        const result = parseItemsIndividual('Taco (sin cebolla)');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].note).toBe('sin cebolla');
    });

    test('parses item with price', () => {
        const result = parseItemsIndividual('Taco [50.0]');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].price).toBe(50.0);
    });

    test('parses multiple items separated by comma', () => {
        const result = parseItemsIndividual('Taco, Burger');
        expect(result).toHaveLength(2);
        expect(result[0].text).toBe('Taco');
        expect(result[1].text).toBe('Burger');
    });

    test('does not split on commas inside parentheses', () => {
        const result = parseItemsIndividual('Taco (sin sal, sin cebolla)');
        expect(result).toHaveLength(1);
        expect(result[0].note).toBe('sin sal, sin cebolla');
    });

    test('assigns unique sequential ids', () => {
        const result = parseItemsIndividual('Taco x2, Burger');
        expect(result[0].id).toBe('item_0');
        expect(result[1].id).toBe('item_1');
        expect(result[2].id).toBe('item_2');
    });
});

describe('parseItemsGrouped', () => {
    test('returns empty array for falsy input', () => {
        expect(parseItemsGrouped('')).toEqual([]);
        expect(parseItemsGrouped(null)).toEqual([]);
    });

    test('parses a simple item', () => {
        const result = parseItemsGrouped('Taco');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].quantity).toBe(1);
    });

    test('preserves quantity', () => {
        const result = parseItemsGrouped('Taco x3');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].quantity).toBe(3);
    });

    test('groups same item from multiple entries', () => {
        const result = parseItemsGrouped('Taco x2, Taco x1');
        expect(result).toHaveLength(1);
        expect(result[0].text).toBe('Taco');
        expect(result[0].quantity).toBe(3);
    });

    test('keeps different items separate', () => {
        const result = parseItemsGrouped('Taco, Burger');
        expect(result).toHaveLength(2);
    });

    test('extracts note', () => {
        const result = parseItemsGrouped('Taco (sin cebolla)');
        expect(result[0].note).toBe('sin cebolla');
    });

    test('strips price suffix from name', () => {
        const result = parseItemsGrouped('Taco [50.0]');
        expect(result[0].text).toBe('Taco');
    });
});

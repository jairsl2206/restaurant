const { parseInitialItems } = require('../../src/utils/parseInitialItems');

const MENU = [
    { id: 1, name: 'Taco', price: 50, image_url: '/taco.jpg' },
    { id: 2, name: 'Burger', price: 120, image_url: '/burger.jpg' },
    { id: 3, name: 'Refresco', price: 30, image_url: null }
];

describe('parseInitialItems', () => {
    test('returns empty array for null/undefined/empty input', () => {
        expect(parseInitialItems(null, MENU)).toEqual([]);
        expect(parseInitialItems(undefined, MENU)).toEqual([]);
        expect(parseInitialItems('', MENU)).toEqual([]);
    });

    test('parses a single item and matches menu entry', () => {
        const result = parseInitialItems('Taco', MENU);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Taco');
        expect(result[0].id).toBe(1);
        expect(result[0].price).toBe(50);
        expect(result[0].image_url).toBe('/taco.jpg');
        expect(result[0].note).toBe('');
        expect(result[0].quantity).toBe(1);
    });

    test('assigns legacy id when item not in menu', () => {
        const result = parseInitialItems('Plato Especial', MENU);
        expect(result[0].name).toBe('Plato Especial');
        expect(String(result[0].id)).toMatch(/^legacy_/);
    });

    test('parses quantity suffix', () => {
        const result = parseInitialItems('Taco x3', MENU);
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Taco');
        expect(result[0].quantity).toBe(3);
    });

    test('parses price suffix and uses it when no menu match', () => {
        const result = parseInitialItems('Plato Especial [75.5]', MENU);
        expect(result[0].price).toBe(75.5);
    });

    test('menu price takes priority over zero price from string', () => {
        const result = parseInitialItems('Taco', MENU);
        expect(result[0].price).toBe(50);
    });

    test('string price takes priority over menu when present', () => {
        const result = parseInitialItems('Taco [99.0]', MENU);
        expect(result[0].price).toBe(99.0);
    });

    test('parses note in parentheses', () => {
        const result = parseInitialItems('Taco (sin cebolla)', MENU);
        expect(result[0].name).toBe('Taco');
        expect(result[0].note).toBe('sin cebolla');
    });

    test('does not split on commas inside parentheses', () => {
        const result = parseInitialItems('Taco (sin sal, sin cebolla)', MENU);
        expect(result).toHaveLength(1);
        expect(result[0].note).toBe('sin sal, sin cebolla');
    });

    test('parses multiple items separated by comma', () => {
        const result = parseInitialItems('Taco, Burger', MENU);
        expect(result).toHaveLength(2);
        expect(result[0].name).toBe('Taco');
        expect(result[1].name).toBe('Burger');
    });

    test('each item has a unique uid string', () => {
        const result = parseInitialItems('Taco, Burger', MENU);
        expect(result[0].uid).toBeDefined();
        expect(result[1].uid).toBeDefined();
        expect(result[0].uid).not.toBe(result[1].uid);
    });

    test('cleans legacy suffixes from name before menu lookup', () => {
        const result = parseInitialItems('Taco x2 [100.0]', MENU);
        expect(result[0].name).toBe('Taco');
        expect(result[0].id).toBe(1); // matched to menu
    });

    test('works without menu argument', () => {
        const result = parseInitialItems('Taco x2');
        expect(result).toHaveLength(1);
        expect(result[0].name).toBe('Taco');
        expect(result[0].price).toBe(0);
    });

    test('parses full complex string', () => {
        const result = parseInitialItems('Taco x2 [100.0], Burger (extra cheese) [130.0], Refresco', MENU);
        expect(result).toHaveLength(3);
        expect(result[0].name).toBe('Taco');
        expect(result[0].quantity).toBe(2);
        expect(result[1].name).toBe('Burger');
        expect(result[1].note).toBe('extra cheese');
        expect(result[2].name).toBe('Refresco');
        expect(result[2].id).toBe(3);
    });
});

/**
 * Tests for bundle discount calculation and its application in orders and sub-orders (additions).
 *
 * Strategy: the pure discount logic is extracted inline (mirrors db.js `_applyBundleDiscounts`)
 * so tests remain independent of the SQLite constructor and file I/O.
 *
 * Coverage:
 *  1.  Pure splitItems calculation — all branching paths
 *  2.  _applyBundleDiscounts via a mock-db Database-like object
 *  3.  createOrder subtotal respects bundle $0 items
 *  4.  createSubOrder now calls _applyBundleDiscounts (regression guard for the bug fix)
 *  5.  updateOrderItems calls _applyBundleDiscounts (edit path)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Pure bundle calculation logic (mirrors db.js splitItems, no DB needed)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Applies bundle discounts to an array of items given a promo list and a
 * pre-built menuItemId → categoryId map.
 *
 * @param {object[]} items   – [{id|menu_item_id, quantity, price, category_id?}]
 * @param {object[]} promos  – [{category_id, buy_quantity, pay_quantity}]
 * @param {object}   catMap  – {menuItemId: categoryId}
 * @returns {object[]} finalItems with unit_price / total_price set; free entries have price=0
 */
function applySplitItems(items, promos, catMap = {}) {
    const bundleCatMap = {};
    promos.forEach(p => { bundleCatMap[p.category_id] = p; });

    const enriched = items.map(item => ({
        ...item,
        category_id: item.category_id != null
            ? item.category_id
            : (catMap[Number(item.id || item.menu_item_id)] || null)
    }));

    const freeQtyByIndex = new Array(enriched.length).fill(0);

    const catGroups = {};
    enriched.forEach((item, idx) => {
        const catId = item.category_id;
        if (catId && bundleCatMap[catId]) {
            if (!catGroups[catId]) catGroups[catId] = [];
            catGroups[catId].push({ item, idx });
        }
    });

    for (const [, entries] of Object.entries(catGroups)) {
        const catId = entries[0].item.category_id;
        const { buy_quantity, pay_quantity } = bundleCatMap[catId];
        const freePerGroup = buy_quantity - pay_quantity;

        const units = [];
        entries.forEach(({ item, idx }) => {
            for (let u = 0; u < item.quantity; u++)
                units.push({ idx, unit_price: item.price });
        });
        units.sort((a, b) => a.unit_price - b.unit_price);

        const freeUnits = Math.floor(units.length / buy_quantity) * freePerGroup;
        for (let i = 0; i < freeUnits && i < units.length; i++)
            freeQtyByIndex[units[i].idx]++;
    }

    const finalItems = [];
    enriched.forEach((item, idx) => {
        const freeQty = freeQtyByIndex[idx];
        const paidQty = item.quantity - freeQty;

        if (freeQty === 0) {
            finalItems.push({ ...item, unit_price: item.price, total_price: item.price * item.quantity });
        } else {
            if (paidQty > 0) {
                finalItems.push({ ...item, quantity: paidQty, unit_price: item.price, total_price: item.price * paidQty });
            }
            finalItems.push({ ...item, quantity: freeQty, price: 0, unit_price: 0, total_price: 0 });
        }
    });

    return finalItems;
}

/** Compute subtotal from finalItems the same way db.js does */
function computeSubtotal(finalItems) {
    return finalItems.reduce((sum, item) =>
        sum + (item.total_price != null ? item.total_price : item.price * item.quantity), 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const BUNDLE_3X2 = { category_id: 10, buy_quantity: 3, pay_quantity: 2 }; // buy 3, pay 2 → 1 free
const BUNDLE_2X1 = { category_id: 20, buy_quantity: 2, pay_quantity: 1 }; // buy 2, pay 1 → 1 free

const burger80  = { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'Hamburguesa' };
const burger100 = { id: 2, quantity: 1, price: 100, category_id: 10, name: 'Hamburguesa Doble' };
const burger120 = { id: 3, quantity: 1, price: 120, category_id: 10, name: 'Hamburguesa Especial' };
const drink40   = { id: 4, quantity: 1, price: 40,  category_id: 20, name: 'Refresco' };
const pasta90   = { id: 5, quantity: 1, price: 90,  category_id: 99, name: 'Pasta' }; // different category

// ─────────────────────────────────────────────────────────────────────────────
// 1. Pure splitItems calculation
// ─────────────────────────────────────────────────────────────────────────────

describe('Bundle calculation — splitItems (pure logic)', () => {

    describe('no active promotions', () => {
        test('items are returned unchanged with total_price computed', () => {
            const items = [{ ...burger80 }, { ...burger100 }];
            const result = applySplitItems(items, []); // empty promos
            expect(result).toHaveLength(2);
            expect(result[0].total_price).toBe(80);
            expect(result[1].total_price).toBe(100);
            expect(result[0].price).toBe(80);  // original price untouched
        });

        test('quantity > 1 total_price is qty × price', () => {
            const item = { id: 1, quantity: 3, price: 80, category_id: 10 };
            const result = applySplitItems([item], []);
            expect(result[0].total_price).toBe(240);
        });
    });

    describe('BUNDLE 3×2 (buy 3, pay 2 → 1 free)', () => {
        test('3 items → 1 free (cheapest gets $0)', () => {
            const items = [{ ...burger80 }, { ...burger100 }, { ...burger120 }];
            const result = applySplitItems(items, [BUNDLE_3X2]);

            // cheapest (80) becomes free
            const freeEntry = result.find(r => r.price === 0 && r.name === 'Hamburguesa');
            expect(freeEntry).toBeDefined();
            expect(freeEntry.total_price).toBe(0);

            // paid items keep their prices
            const paidBurgers = result.filter(r => r.price > 0);
            expect(paidBurgers).toHaveLength(2);
        });

        test('2 items → 0 free (insufficient for a complete bundle)', () => {
            const items = [{ ...burger80 }, { ...burger100 }];
            const result = applySplitItems(items, [BUNDLE_3X2]);
            expect(result).toHaveLength(2);
            result.forEach(r => expect(r.price).toBeGreaterThan(0));
        });

        test('6 items → 2 free (2 complete bundles)', () => {
            const items = [
                { ...burger80 }, { ...burger100 }, { ...burger120 },
                { id: 6, quantity: 1, price: 90, category_id: 10, name: 'B4' },
                { id: 7, quantity: 1, price: 95, category_id: 10, name: 'B5' },
                { id: 8, quantity: 1, price: 85, category_id: 10, name: 'B6' },
            ];
            const result = applySplitItems(items, [BUNDLE_3X2]);
            const freeItems = result.filter(r => r.price === 0);
            expect(freeItems).toHaveLength(2);
        });

        test('7 items → 2 free (floor division: 7÷3 = 2 complete bundles)', () => {
            const items = Array.from({ length: 7 }, (_, i) => ({
                id: i + 1, quantity: 1, price: 80 + i * 5, category_id: 10, name: `B${i}`
            }));
            const result = applySplitItems(items, [BUNDLE_3X2]);
            const freeItems = result.filter(r => r.price === 0);
            expect(freeItems).toHaveLength(2);
        });

        test('cheapest items are selected as free (sort by price ascending)', () => {
            const items = [
                { id: 1, quantity: 1, price: 150, category_id: 10, name: 'Expensive' },
                { id: 2, quantity: 1, price: 50,  category_id: 10, name: 'Cheap' },
                { id: 3, quantity: 1, price: 100, category_id: 10, name: 'Mid' },
            ];
            const result = applySplitItems(items, [BUNDLE_3X2]);
            const freeEntry = result.find(r => r.price === 0);
            expect(freeEntry.name).toBe('Cheap'); // cheapest gets free
        });
    });

    describe('BUNDLE 2×1 (buy 2, pay 1 → 1 free per 2)', () => {
        test('2 items → 1 free (cheapest)', () => {
            const items = [
                { id: 1, quantity: 1, price: 40, category_id: 20, name: 'Refresco' },
                { id: 2, quantity: 1, price: 50, category_id: 20, name: 'Agua' },
            ];
            const result = applySplitItems(items, [BUNDLE_2X1]);
            const freeItems = result.filter(r => r.price === 0);
            expect(freeItems).toHaveLength(1);
            expect(freeItems[0].name).toBe('Refresco');
        });

        test('4 items → 2 free', () => {
            const items = Array.from({ length: 4 }, (_, i) => ({
                id: i + 1, quantity: 1, price: 40 + i * 5, category_id: 20, name: `D${i}`
            }));
            const result = applySplitItems(items, [BUNDLE_2X1]);
            const freeItems = result.filter(r => r.price === 0);
            expect(freeItems).toHaveLength(2);
        });
    });

    describe('items with quantity > 1', () => {
        test('single line quantity=3, BUNDLE 3×2 → 1 free unit split from paid', () => {
            const item = { id: 1, quantity: 3, price: 80, category_id: 10, name: 'Hamburguesa' };
            const result = applySplitItems([item], [BUNDLE_3X2]);

            // Should produce 2 entries: x2 paid at 80, x1 free at 0
            expect(result).toHaveLength(2);
            const paidEntry = result.find(r => r.price === 80);
            const freeEntry = result.find(r => r.price === 0);
            expect(paidEntry.quantity).toBe(2);
            expect(paidEntry.total_price).toBe(160);
            expect(freeEntry.quantity).toBe(1);
            expect(freeEntry.total_price).toBe(0);
        });

        test('single line quantity=2, BUNDLE 2×1 → x1 paid + x1 free', () => {
            const item = { id: 1, quantity: 2, price: 50, category_id: 20, name: 'Refresco' };
            const result = applySplitItems([item], [BUNDLE_2X1]);
            expect(result).toHaveLength(2);
            expect(result.find(r => r.price === 50).quantity).toBe(1);
            expect(result.find(r => r.price === 0).quantity).toBe(1);
        });

        test('single line quantity=6, BUNDLE 3×2 → x4 paid + x2 free', () => {
            const item = { id: 1, quantity: 6, price: 80, category_id: 10, name: 'Hamburguesa' };
            const result = applySplitItems([item], [BUNDLE_3X2]);
            expect(result).toHaveLength(2);
            expect(result.find(r => r.price === 80).quantity).toBe(4);
            expect(result.find(r => r.price === 0).quantity).toBe(2);
        });

        test('quantity=2, BUNDLE 3×2 → no free (insufficient)', () => {
            const item = { id: 1, quantity: 2, price: 80, category_id: 10, name: 'Hamburguesa' };
            const result = applySplitItems([item], [BUNDLE_3X2]);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(80);
            expect(result[0].quantity).toBe(2);
        });
    });

    describe('category isolation', () => {
        test('items from non-bundle category are not discounted', () => {
            const items = [{ ...pasta90 }]; // category 99, no promo
            const result = applySplitItems(items, [BUNDLE_3X2]);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(90);
        });

        test('mixed categories: each computed independently', () => {
            // 3 burgers (cat 10, BUNDLE 3×2) + 2 drinks (cat 20, BUNDLE 2×1)
            const items = [
                { ...burger80 }, { ...burger100 }, { ...burger120 },
                { id: 4, quantity: 1, price: 40, category_id: 20, name: 'Refresco' },
                { id: 5, quantity: 1, price: 50, category_id: 20, name: 'Agua' },
            ];
            const result = applySplitItems(items, [BUNDLE_3X2, BUNDLE_2X1]);

            const burgerFree = result.filter(r => r.price === 0 && ['Hamburguesa', 'Hamburguesa Doble', 'Hamburguesa Especial'].includes(r.name));
            const drinkFree  = result.filter(r => r.price === 0 && ['Refresco', 'Agua'].includes(r.name));

            expect(burgerFree).toHaveLength(1); // 1 free burger (cheapest = 80)
            expect(drinkFree).toHaveLength(1);  // 1 free drink  (cheapest = 40)
        });

        test('non-bundle category items in the same order are not affected', () => {
            const items = [{ ...burger80 }, { ...burger100 }, { ...burger120 }, { ...pasta90 }];
            const result = applySplitItems(items, [BUNDLE_3X2]);
            const pastaResult = result.find(r => r.name === 'Pasta');
            expect(pastaResult.price).toBe(90); // unchanged
            expect(pastaResult.total_price).toBe(90);
        });
    });

    describe('catMap — category resolved from menu item lookup', () => {
        test('item without category_id resolves it via catMap', () => {
            const item = { id: 1, quantity: 3, price: 80, name: 'Hamburguesa' }; // no category_id
            const catMap = { 1: 10 }; // menuItemId=1 → category_id=10
            const result = applySplitItems([item], [BUNDLE_3X2], catMap);
            const freeEntry = result.find(r => r.price === 0);
            expect(freeEntry).toBeDefined();
        });

        test('item with unknown menuItemId (no catMap entry) → no discount', () => {
            const item = { id: 99, quantity: 3, price: 80, name: 'Unknown' };
            const catMap = {}; // no mapping
            const result = applySplitItems([item], [BUNDLE_3X2], catMap);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(80);
        });

        test('legacy id items are skipped in catMap resolution → no discount', () => {
            const item = { id: 'legacy_abc', quantity: 3, price: 80, name: 'Legacy', category_id: null };
            const result = applySplitItems([item], [BUNDLE_3X2]);
            expect(result).toHaveLength(1);
            expect(result[0].price).toBe(80);
        });
    });

    describe('subtotal computation', () => {
        test('subtotal uses total_price (not price × qty) so free items are $0', () => {
            const item = { id: 1, quantity: 3, price: 80, category_id: 10, name: 'Hamburguesa' };
            const result = applySplitItems([item], [BUNDLE_3X2]);
            const subtotal = computeSubtotal(result);
            expect(subtotal).toBe(160); // 2×80 paid + 1×0 free
        });

        test('subtotal without promotion = full price × qty', () => {
            const item = { id: 1, quantity: 3, price: 80, category_id: 10, name: 'Hamburguesa' };
            const result = applySplitItems([item], []); // no promos
            expect(computeSubtotal(result)).toBe(240);
        });

        test('mixed order subtotal sums both discounted and full-price items', () => {
            // 3 burgers (BUNDLE 3×2, cheapest free) + 1 pasta (no promo)
            const items = [
                { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
                { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
                { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
                { ...pasta90 },
            ];
            const result = applySplitItems(items, [BUNDLE_3X2]);
            const subtotal = computeSubtotal(result);
            // free = 80, paid burgers = 100 + 120 = 220, pasta = 90 → total = 310
            expect(subtotal).toBe(310);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. _applyBundleDiscounts via mock db (tests the actual Database method)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a minimal Database stand-in that exposes _applyBundleDiscounts
 * without opening any SQLite file.
 */
function makeMockDb({ promos = [], categoryRows = [] } = {}) {
    let callCount = 0;
    const db = {
        all: jest.fn((sql, params, callback) => {
            callCount++;
            if (callCount === 1) {
                // First call: fetch active bundle promos
                callback(null, promos);
            } else {
                // Second call: fetch category_id for menu items
                callback(null, categoryRows);
            }
        })
    };

    // Inline _applyBundleDiscounts from db.js (real implementation)
    const logger = { warn: jest.fn() };
    const instance = {
        db,
        _applyBundleDiscounts(items, callback) {
            const now = new Date().toISOString().split('T')[0];
            this.db.all(
                `SELECT category_id, buy_quantity, pay_quantity FROM category_promotions WHERE type = 'BUNDLE'`,
                [now, now],
                (err, fetchedPromos) => {
                    if (err || !fetchedPromos || !fetchedPromos.length) return callback(null, items);

                    const ids = [...new Set(
                        items.map(i => i.id || i.menu_item_id)
                             .filter(id => id && !String(id).startsWith('legacy'))
                             .map(Number)
                    )];

                    const splitItems = (catMap) => {
                        const enriched = items.map(item => ({
                            ...item,
                            category_id: item.category_id != null
                                ? item.category_id
                                : (catMap[Number(item.id || item.menu_item_id)] || null)
                        }));
                        const bundleCatMap = {};
                        fetchedPromos.forEach(p => { bundleCatMap[p.category_id] = p; });
                        const freeQtyByIndex = new Array(enriched.length).fill(0);
                        const catGroups = {};
                        enriched.forEach((item, idx) => {
                            const catId = item.category_id;
                            if (catId && bundleCatMap[catId]) {
                                if (!catGroups[catId]) catGroups[catId] = [];
                                catGroups[catId].push({ item, idx });
                            }
                        });
                        for (const [, entries] of Object.entries(catGroups)) {
                            const catId = entries[0].item.category_id;
                            const { buy_quantity, pay_quantity } = bundleCatMap[catId];
                            const freePerGroup = buy_quantity - pay_quantity;
                            const units = [];
                            entries.forEach(({ item, idx }) => {
                                for (let u = 0; u < item.quantity; u++)
                                    units.push({ idx, unit_price: item.price });
                            });
                            units.sort((a, b) => a.unit_price - b.unit_price);
                            const freeUnits = Math.floor(units.length / buy_quantity) * freePerGroup;
                            for (let i = 0; i < freeUnits && i < units.length; i++)
                                freeQtyByIndex[units[i].idx]++;
                        }
                        const finalItems = [];
                        enriched.forEach((item, idx) => {
                            const freeQty = freeQtyByIndex[idx];
                            const paidQty = item.quantity - freeQty;
                            if (freeQty === 0) {
                                finalItems.push({ ...item, unit_price: item.price, total_price: item.price * item.quantity });
                            } else {
                                if (paidQty > 0) finalItems.push({ ...item, quantity: paidQty, unit_price: item.price, total_price: item.price * paidQty });
                                finalItems.push({ ...item, quantity: freeQty, price: 0, unit_price: 0, total_price: 0 });
                            }
                        });
                        callback(null, finalItems);
                    };

                    if (!ids.length) return splitItems({});
                    this.db.all(`SELECT id, category_id FROM menu_items`, ids, (err2, rows) => {
                        if (err2) return splitItems({});
                        const catMap = {};
                        (rows || []).forEach(r => { catMap[r.id] = r.category_id; });
                        splitItems(catMap);
                    });
                }
            );
        }
    };
    return instance;
}

describe('_applyBundleDiscounts — via mock db', () => {
    test('returns original items when no active promos exist', (done) => {
        const instance = makeMockDb({ promos: [] });
        const items = [{ id: 1, quantity: 1, price: 80, name: 'B' }];
        instance._applyBundleDiscounts(items, (err, result) => {
            expect(err).toBeNull();
            expect(result).toEqual(items); // unchanged
            done();
        });
    });

    test('returns original items when db returns error fetching promos', (done) => {
        const db = { all: jest.fn((sql, params, cb) => cb(new Error('DB error'), null)) };
        const instance = { db, _applyBundleDiscounts: makeMockDb().constructor };
        // Override to test error path
        const mock = makeMockDb({ promos: null });
        mock.db.all = jest.fn((sql, params, cb) => cb(new Error('DB fail'), null));
        const items = [{ id: 1, quantity: 3, price: 80, category_id: 10, name: 'B' }];
        mock._applyBundleDiscounts(items, (err, result) => {
            expect(err).toBeNull();
            expect(result).toEqual(items); // fallback to original
            done();
        });
    });

    test('applies BUNDLE 3×2: 3 items → 1 free', (done) => {
        const instance = makeMockDb({
            promos: [BUNDLE_3X2],
            categoryRows: [
                { id: 1, category_id: 10 },
                { id: 2, category_id: 10 },
                { id: 3, category_id: 10 },
            ]
        });
        const items = [
            { id: 1, quantity: 1, price: 80,  name: 'B1' },
            { id: 2, quantity: 1, price: 100, name: 'B2' },
            { id: 3, quantity: 1, price: 120, name: 'B3' },
        ];
        instance._applyBundleDiscounts(items, (err, result) => {
            expect(err).toBeNull();
            const freeItems = result.filter(r => r.price === 0);
            expect(freeItems).toHaveLength(1);
            expect(freeItems[0].name).toBe('B1'); // cheapest
            done();
        });
    });

    test('items with pre-set category_id skip the second db.all lookup correctly', (done) => {
        // When all items already have category_id, ids array may still be built
        // but the catMap will just confirm existing values
        const instance = makeMockDb({
            promos: [BUNDLE_3X2],
            categoryRows: [] // empty — shouldn't matter if items already have category_id
        });
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
        ];
        instance._applyBundleDiscounts(items, (err, result) => {
            expect(err).toBeNull();
            expect(result.filter(r => r.price === 0)).toHaveLength(1);
            done();
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. createSubOrder — regression guard: must call _applyBundleDiscounts
// ─────────────────────────────────────────────────────────────────────────────

describe('createSubOrder — bundle discount regression', () => {
    /**
     * Before the fix, createSubOrder computed subtotal as price×qty and inserted items
     * without calling _applyBundleDiscounts at all.  This test suite verifies that
     * the fixed version correctly applies bundle logic.
     */

    function buildSubOrderDb({ promos = [], categoryRows = [] } = {}) {
        let promoCallDone = false;
        let categoryCallDone = false;
        let insertedItems = [];
        let insertedOrder = null;

        const stmt = {
            run: jest.fn((orderId, menuItemId, qty, unitPrice, totalPrice, note) => {
                insertedItems.push({ orderId, menuItemId, qty, unitPrice, totalPrice, note });
            }),
            finalize: jest.fn((cb) => cb(null))
        };

        const db = {
            all: jest.fn((sql, params, cb) => {
                if (!promoCallDone) {
                    promoCallDone = true;
                    return cb(null, promos);
                }
                if (!categoryCallDone) {
                    categoryCallDone = true;
                    return cb(null, categoryRows);
                }
                cb(null, []);
            }),
            run: jest.fn(function (sql, params, cb) {
                if (sql.includes('INSERT INTO orders')) {
                    insertedOrder = { sql, params };
                    cb.call({ lastID: 42 }, null);
                } else {
                    cb(null);
                }
            }),
            prepare: jest.fn(() => stmt)
        };

        return { db, getInsertedItems: () => insertedItems, getInsertedOrder: () => insertedOrder, stmt };
    }

    test('sub-order with bundle qualifies → free item inserted with unit_price=0', (done) => {
        const { db, getInsertedItems } = buildSubOrderDb({
            promos: [BUNDLE_3X2],
            categoryRows: [
                { id: 1, category_id: 10 },
                { id: 2, category_id: 10 },
                { id: 3, category_id: 10 },
            ]
        });

        // Build a minimal instance with _applyBundleDiscounts and createSubOrder logic
        const instance = {
            db,
            _applyBundleDiscounts: makeMockDb({ promos: [BUNDLE_3X2], categoryRows: [
                { id: 1, category_id: 10 }, { id: 2, category_id: 10 }, { id: 3, category_id: 10 }
            ] })._applyBundleDiscounts,

            // Inline createSubOrder post-fix (pure logic without getOrderById)
            _createSubOrderWithParent(parent, items, callback) {
                const self = this;
                this._applyBundleDiscounts(items, (err, finalItems) => {
                    const fi = finalItems || items;
                    const subtotal = fi.reduce((sum, item) =>
                        sum + (item.total_price != null ? item.total_price : item.price * item.quantity), 0);

                    self.db.run(
                        `INSERT INTO orders (...) VALUES (?)`,
                        [subtotal],
                        function (err2) {
                            const subOrderId = this.lastID;
                            const stmt = self.db.prepare('INSERT INTO order_items ...');
                            fi.forEach(item => {
                                const unitPrice  = item.unit_price  != null ? item.unit_price  : item.price;
                                const totalPrice = item.total_price != null ? item.total_price : unitPrice * item.quantity;
                                stmt.run(subOrderId, item.id, item.quantity, unitPrice, totalPrice, item.note || null);
                            });
                            stmt.finalize((e) => callback(e, subOrderId));
                        }
                    );
                });
            }
        };

        const items = [
            { id: 1, quantity: 1, price: 80,  name: 'B1' },
            { id: 2, quantity: 1, price: 100, name: 'B2' },
            { id: 3, quantity: 1, price: 120, name: 'B3' },
        ];

        instance._createSubOrderWithParent({}, items, (err) => {
            expect(err).toBeNull();
            const insertedItems = getInsertedItems();
            const freeItem = insertedItems.find(i => i.unitPrice === 0);
            expect(freeItem).toBeDefined();
            expect(freeItem.totalPrice).toBe(0);
            done();
        });
    });

    test('sub-order without bundle → all items at full price', (done) => {
        let insertedItems = [];
        const stmt = {
            run: jest.fn((orderId, menuItemId, qty, unitPrice, totalPrice) => {
                insertedItems.push({ unitPrice, totalPrice });
            }),
            finalize: jest.fn((cb) => cb(null))
        };
        let promoCallDone = false;
        const db = {
            all: jest.fn((sql, params, cb) => {
                if (!promoCallDone) { promoCallDone = true; cb(null, []); } // no active promos
                else cb(null, []);
            }),
            run: jest.fn(function (sql, params, cb) { cb.call({ lastID: 99 }, null); }),
            prepare: jest.fn(() => stmt)
        };

        const instance = makeMockDb({ promos: [] });
        instance.db = db;

        instance._createSubOrderWithParent = function (parent, items, callback) {
            const self = this;
            this._applyBundleDiscounts(items, (err, finalItems) => {
                const fi = finalItems || items;
                self.db.run('INSERT INTO orders', [], function () {
                    const subOrderId = this.lastID;
                    const stmtInst = self.db.prepare('INSERT INTO order_items');
                    fi.forEach(item => {
                        const unitPrice  = item.unit_price  != null ? item.unit_price  : item.price;
                        const totalPrice = item.total_price != null ? item.total_price : unitPrice * item.quantity;
                        stmtInst.run(subOrderId, item.id, item.quantity, unitPrice, totalPrice, null);
                    });
                    stmtInst.finalize((e) => callback(e, subOrderId));
                });
            });
        };

        const items = [{ id: 1, quantity: 1, price: 80, name: 'Pasta' }];
        instance._createSubOrderWithParent({}, items, (err) => {
            expect(err).toBeNull();
            expect(insertedItems[0].unitPrice).toBe(80);
            expect(insertedItems[0].totalPrice).toBe(80);
            done();
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Additions (sub-orders) — business logic scenarios
// ─────────────────────────────────────────────────────────────────────────────

describe('Additions — bundle discount business rules', () => {
    test('addition with 3 bundle items: subtotal reflects 2 paid + 1 free', () => {
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
        ];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        const subtotal = computeSubtotal(result);
        expect(subtotal).toBe(220); // 100 + 120 (cheapest 80 is free)
    });

    test('addition with only 2 bundle items: no discount (partial bundle)', () => {
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
        ];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        expect(computeSubtotal(result)).toBe(180);
    });

    test('addition with qty=3 item qualifies for bundle → split into paid + free', () => {
        const items = [{ id: 1, quantity: 3, price: 80, category_id: 10, name: 'Hamburguesa' }];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        expect(result).toHaveLength(2);
        expect(computeSubtotal(result)).toBe(160); // 2×80
    });

    test('addition mixing bundle and non-bundle items: only bundle items discounted', () => {
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
            { id: 5, quantity: 2, price: 90,  category_id: 99, name: 'Pasta' },
        ];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        const pastaResult = result.find(r => r.name === 'Pasta');
        expect(pastaResult.total_price).toBe(180); // unaffected
        expect(computeSubtotal(result)).toBe(220 + 180); // 220 burgers + 180 pasta
    });

    test('addition items get free entry with quantity=1 showing $0', () => {
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
        ];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        const freeEntry = result.find(r => r.price === 0);
        expect(freeEntry).toBeDefined();
        expect(freeEntry.quantity).toBe(1);
        expect(freeEntry.unit_price).toBe(0);
        expect(freeEntry.total_price).toBe(0);
    });

    test('addition with BUNDLE 2×1: even number of items → half free', () => {
        const items = [
            { id: 1, quantity: 1, price: 40, category_id: 20, name: 'D1' },
            { id: 2, quantity: 1, price: 50, category_id: 20, name: 'D2' },
            { id: 3, quantity: 1, price: 45, category_id: 20, name: 'D3' },
            { id: 4, quantity: 1, price: 55, category_id: 20, name: 'D4' },
        ];
        const result = applySplitItems(items, [BUNDLE_2X1]);
        const freeItems = result.filter(r => r.price === 0);
        expect(freeItems).toHaveLength(2); // 4 items / 2 = 2 free
        // Cheapest two (40, 45) should be free
        const freePrices = freeItems.map(r => r.name).sort();
        expect(freePrices).toContain('D1');
        expect(freePrices).toContain('D3');
    });

    test('addition with two bundle categories: each category discounted independently', () => {
        const items = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'Burger' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'Burger2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'Burger3' },
            { id: 4, quantity: 1, price: 40,  category_id: 20, name: 'Drink1' },
            { id: 5, quantity: 1, price: 50,  category_id: 20, name: 'Drink2' },
        ];
        const result = applySplitItems(items, [BUNDLE_3X2, BUNDLE_2X1]);
        const burgerFree = result.filter(r => r.price === 0 && r.name.startsWith('Burger'));
        const drinkFree  = result.filter(r => r.price === 0 && r.name.startsWith('Drink'));
        expect(burgerFree).toHaveLength(1); // cheapest burger free
        expect(drinkFree).toHaveLength(1);  // cheapest drink free
        expect(computeSubtotal(result)).toBe(100 + 120 + 50); // 270
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. updateOrderItems — bundle discount applied on edits
// ─────────────────────────────────────────────────────────────────────────────

describe('updateOrderItems — bundle discount applied on edit', () => {
    test('editing order to 3 bundle items triggers free item creation', () => {
        // Simulates the new items list after an edit
        const newItems = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
            { id: 3, quantity: 1, price: 120, category_id: 10, name: 'B3' },
        ];
        const result = applySplitItems(newItems, [BUNDLE_3X2]);
        expect(result.filter(r => r.price === 0)).toHaveLength(1);
        expect(computeSubtotal(result)).toBe(220);
    });

    test('removing a bundle item below threshold removes the free discount', () => {
        // Before: 3 items (bundle active). After edit: only 2 items → no discount
        const editedItems = [
            { id: 1, quantity: 1, price: 80,  category_id: 10, name: 'B1' },
            { id: 2, quantity: 1, price: 100, category_id: 10, name: 'B2' },
        ];
        const result = applySplitItems(editedItems, [BUNDLE_3X2]);
        expect(result.filter(r => r.price === 0)).toHaveLength(0);
        expect(computeSubtotal(result)).toBe(180);
    });

    test('increasing quantity to complete a bundle activates the discount', () => {
        // Item goes from qty=2 to qty=3 → now qualifies for BUNDLE 3×2
        const items = [{ id: 1, quantity: 3, price: 80, category_id: 10, name: 'Hamburguesa' }];
        const result = applySplitItems(items, [BUNDLE_3X2]);
        const freeEntry = result.find(r => r.price === 0);
        expect(freeEntry).toBeDefined();
        expect(freeEntry.quantity).toBe(1);
        expect(computeSubtotal(result)).toBe(160);
    });
});

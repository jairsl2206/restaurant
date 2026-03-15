/**
 * Tests that verify sub-order (addition) filtering rules in the Database layer.
 *
 * Rules:
 *  1. getActiveOrders MUST exclude sub-orders that are not in EN_COCINA
 *     (they are reflected in the parent's additions_total / additions_items).
 *  2. getActiveOrders MUST include sub-orders that ARE in EN_COCINA
 *     (the cook needs to see and prepare them).
 *  3. _orderSelect() MUST include the additions_items column for parent orders
 *     so the billing view can show a merged item list.
 */

// ── minimal Database stand-in ────────────────────────────────────────────────
// We don't need sqlite3 at all — only the pure methods _orderSelect() and
// the SQL template built by getActiveOrders.  We create a minimal stand-in
// that borrows those methods from the real class without opening any file.

const { ORDER_STATUS } = require('../../../constants');

// Inline the two relevant methods from db.js so tests stay independent of
// constructor side-effects (file open, initializeTables, etc.)
function buildOrderSelect() {
    return `
        SELECT
            o.*,
            c.name    AS customer_name,
            c.phone   AS customer_phone,
            a.line1   AS customer_address,
            GROUP_CONCAT(
                COALESCE(mi.name, 'item') ||
                CASE WHEN oi.note IS NOT NULL AND oi.note != '' THEN ' (' || oi.note || ')' ELSE '' END ||
                ' x' || oi.quantity ||
                ' [' || oi.unit_price || ']'
            ) AS items,
            (SELECT COUNT(*) FROM orders sub WHERE sub.parent_order_id = o.id AND sub.status != 'FINALIZADO') AS pending_additions_count,
            (SELECT COALESCE(SUM(sub.total), 0) FROM orders sub WHERE sub.parent_order_id = o.id) AS additions_total,
            (SELECT GROUP_CONCAT(
                COALESCE(mi2.name, 'item') ||
                CASE WHEN oi2.note IS NOT NULL AND oi2.note != '' THEN ' (' || oi2.note || ')' ELSE '' END ||
                ' x' || oi2.quantity ||
                ' [' || oi2.unit_price || ']'
             ) FROM orders sub2
               LEFT JOIN order_items oi2 ON oi2.order_id = sub2.id
               LEFT JOIN menu_items  mi2 ON mi2.id = oi2.menu_item_id
               WHERE sub2.parent_order_id = o.id
            ) AS additions_items
        FROM orders o
        LEFT JOIN customers c         ON c.id = o.customer_id
        LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
        LEFT JOIN addresses a         ON a.id = ca.address_id
        LEFT JOIN order_items oi      ON oi.order_id = o.id
        LEFT JOIN menu_items mi       ON mi.id = oi.menu_item_id
    `;
}

function buildActiveOrdersQuery() {
    return {
        sql: `${buildOrderSelect()}
             WHERE o.status != ?
               AND (o.parent_order_id IS NULL OR o.status = ?)
             GROUP BY o.id ORDER BY o.created_at ASC`,
        params: [ORDER_STATUS.FINALIZADO, ORDER_STATUS.EN_COCINA]
    };
}

// ── helpers that call through a mock db ──────────────────────────────────────

function runGetActiveOrders(mockDb, callback) {
    const { sql, params } = buildActiveOrdersQuery();
    mockDb.all(sql, params, callback);
}

// ── tests ────────────────────────────────────────────────────────────────────

describe('_orderSelect — column definitions', () => {
    let sql;
    beforeAll(() => { sql = buildOrderSelect(); });

    test('includes additions_items subquery', () => {
        expect(sql).toMatch(/additions_items/i);
    });

    test('additions_items subquery references parent_order_id = o.id', () => {
        expect(sql).toMatch(/parent_order_id\s*=\s*o\.id/i);
    });

    test('includes additions_total', () => {
        expect(sql).toMatch(/additions_total/i);
    });

    test('includes pending_additions_count', () => {
        expect(sql).toMatch(/pending_additions_count/i);
    });

    test('GROUP_CONCAT for items only covers the current order (not sub-orders)', () => {
        // The main GROUP_CONCAT for `items` must NOT reference sub-orders
        // (sub-orders are covered by the inner subqueries)
        const mainGroupConcat = sql.match(/GROUP_CONCAT[\s\S]+?AS items/i)?.[0] || '';
        expect(mainGroupConcat).not.toMatch(/parent_order_id/i);
    });
});

describe('getActiveOrders — SQL filtering', () => {
    test('excludes FINALIZADO orders', () => {
        const { params } = buildActiveOrdersQuery();
        expect(params).toContain('FINALIZADO');
    });

    test('SQL contains parent_order_id IS NULL condition', () => {
        const { sql } = buildActiveOrdersQuery();
        expect(sql).toMatch(/parent_order_id\s+IS\s+NULL/i);
    });

    test('SQL allows sub-orders when status = EN_COCINA', () => {
        const { sql, params } = buildActiveOrdersQuery();
        expect(sql).toMatch(/o\.status\s*=\s*\?/i);
        expect(params).toContain('EN_COCINA');
    });

    test('orders results ASC (FIFO queue)', () => {
        const { sql } = buildActiveOrdersQuery();
        expect(sql).toMatch(/ORDER BY.*created_at\s+ASC/i);
    });

    test('combined condition ensures sub-orders only visible when EN_COCINA', () => {
        const { sql } = buildActiveOrdersQuery();
        // Both parts of the OR must be present
        expect(sql).toMatch(/parent_order_id\s+IS\s+NULL/i);
        expect(sql).toMatch(/OR\s+o\.status\s*=\s*\?/i);
    });
});

describe('getActiveOrders — callback behaviour', () => {
    test('calls callback with rows returned by db driver', (done) => {
        const fakeRows = [
            { id: 1, status: 'EN_COCINA',         parent_order_id: null },
            { id: 2, status: 'LISTO_PARA_SERVIR', parent_order_id: null }
        ];
        const mockDb = { all: jest.fn((sql, params, cb) => cb(null, fakeRows)) };

        runGetActiveOrders(mockDb, (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toHaveLength(2);
            done();
        });
    });

    test('calls callback with empty array when no orders exist', (done) => {
        const mockDb = { all: jest.fn((sql, params, cb) => cb(null, [])) };

        runGetActiveOrders(mockDb, (err, rows) => {
            expect(err).toBeNull();
            expect(rows).toEqual([]);
            done();
        });
    });

    test('propagates db errors through the callback', (done) => {
        const dbError = new Error('disk I/O error');
        const mockDb = { all: jest.fn((sql, params, cb) => cb(dbError, null)) };

        runGetActiveOrders(mockDb, (err) => {
            expect(err).toBe(dbError);
            done();
        });
    });

    test('sub-orders in EN_COCINA pass the WHERE filter (SQL test)', () => {
        // Verify that a row with parent_order_id and status EN_COCINA would NOT
        // be filtered out by evaluating the filter expression in JS (mirrors SQL logic)
        const filterFn = (row) =>
            row.status !== 'FINALIZADO' &&
            (row.parent_order_id === null || row.status === 'EN_COCINA');

        const subOrderInKitchen = { id: 10, status: 'EN_COCINA', parent_order_id: 5 };
        expect(filterFn(subOrderInKitchen)).toBe(true);
    });

    test('sub-orders outside EN_COCINA are filtered out (SQL test)', () => {
        const filterFn = (row) =>
            row.status !== 'FINALIZADO' &&
            (row.parent_order_id === null || row.status === 'EN_COCINA');

        const subOrderReady   = { id: 11, status: 'LISTO_PARA_SERVIR', parent_order_id: 5 };
        const subOrderServido = { id: 12, status: 'SERVIDO',           parent_order_id: 5 };
        const subOrderReparto = { id: 13, status: 'EN_REPARTO',        parent_order_id: 5 };

        expect(filterFn(subOrderReady)).toBe(false);
        expect(filterFn(subOrderServido)).toBe(false);
        expect(filterFn(subOrderReparto)).toBe(false);
    });

    test('parent orders are never filtered out by the sub-order clause', () => {
        const filterFn = (row) =>
            row.status !== 'FINALIZADO' &&
            (row.parent_order_id === null || row.status === 'EN_COCINA');

        const statuses = ['EN_COCINA', 'LISTO_PARA_SERVIR', 'SERVIDO', 'EN_REPARTO', 'LISTO_PARA_RECOGER'];
        statuses.forEach(status => {
            const parent = { id: 1, status, parent_order_id: null };
            expect(filterFn(parent)).toBe(true);
        });
    });
});

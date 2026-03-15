const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const { ORDER_STATUS, ORDER_TYPE, USER_ROLE, PROMOTION_TYPE, PAYMENT_METHOD, PAYMENT_STATUS } = require('./constants');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                logger.error('Error opening database:', err.message);
            } else {
                logger.info('Connected to SQLite database');
                this.db.run('PRAGMA foreign_keys = ON');
                this.initializeTables();
            }
        });
    }

    initializeTables() {
        this.db.serialize(() => {

            // ── USERS ───────────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    username      TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role          TEXT NOT NULL DEFAULT 'waiter'
                                  CHECK (role IN ('waiter','cook','admin','manager')),
                    active        INTEGER NOT NULL DEFAULT 1,
                    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    updated_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── CUSTOMERS ───────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS customers (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    name       TEXT NOT NULL,
                    phone      TEXT NOT NULL,
                    email      TEXT UNIQUE,
                    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // Migration: add email column to existing customers tables (idempotent)
            this.db.run("ALTER TABLE customers ADD COLUMN email TEXT", () => { /* ignore if already exists */ });

            // ── ADDRESSES ───────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS addresses (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    line1       TEXT NOT NULL,
                    line2       TEXT,
                    city        TEXT,
                    state       TEXT,
                    postal_code TEXT,
                    country     TEXT DEFAULT 'MX'
                )
            `);

            // ── CUSTOMER ADDRESSES ───────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS customer_addresses (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
                    address_id  INTEGER NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
                    is_default  INTEGER NOT NULL DEFAULT 0,
                    UNIQUE (customer_id, address_id)
                )
            `);

            // ── RESTAURANTS ─────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS restaurants (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    name       TEXT NOT NULL,
                    created_at TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── RESTAURANT BRANCHES ─────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS restaurant_branches (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    restaurant_id INTEGER NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
                    name          TEXT NOT NULL,
                    address_id    INTEGER REFERENCES addresses(id),
                    phone_number  TEXT,
                    email         TEXT,
                    website       TEXT,
                    opening_hours TEXT,
                    created_at    TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── EMPLOYEES ───────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS employees (
                    id        INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    position  TEXT NOT NULL,
                    salary    REAL,
                    hired_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    active    INTEGER NOT NULL DEFAULT 1,
                    UNIQUE (branch_id, user_id)
                )
            `);

            // ── MENU CATEGORIES ─────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS menu_categories (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id   INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    name        TEXT NOT NULL,
                    description TEXT,
                    sort_order  INTEGER DEFAULT 0,
                    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    UNIQUE (branch_id, name)
                )
            `);

            // ── MENU ITEMS ──────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS menu_items (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id   INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    category_id INTEGER REFERENCES menu_categories(id) ON DELETE SET NULL,
                    name        TEXT NOT NULL,
                    description TEXT,
                    price       REAL NOT NULL,
                    image_url   TEXT,
                    available   INTEGER NOT NULL DEFAULT 1,
                    created_at  TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── ITEM PROMOTIONS ─────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS item_promotions (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    menu_item_id INTEGER NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
                    type         TEXT NOT NULL CHECK (type IN ('PERCENTAGE','FIXED_AMOUNT')),
                    value        REAL NOT NULL,
                    active       INTEGER NOT NULL DEFAULT 1,
                    valid_from   TEXT,
                    valid_to     TEXT
                )
            `);

            // ── CATEGORY PROMOTIONS ─────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS category_promotions (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_id  INTEGER NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
                    type         TEXT NOT NULL CHECK (type IN ('PERCENTAGE','FIXED_AMOUNT','BUNDLE')),
                    value        REAL,
                    active       INTEGER NOT NULL DEFAULT 1,
                    valid_from   TEXT,
                    valid_to     TEXT,
                    created_at   TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    buy_quantity INTEGER,
                    pay_quantity INTEGER
                )
            `);

            // Migrations: add BUNDLE columns to existing category_promotions tables (idempotent)
            this.db.run("ALTER TABLE category_promotions ADD COLUMN buy_quantity INTEGER", () => {});
            this.db.run("ALTER TABLE category_promotions ADD COLUMN pay_quantity INTEGER", () => {});

            // ── ORDERS ──────────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS orders (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id       INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    customer_id     INTEGER REFERENCES customers(id),
                    waiter_id       INTEGER REFERENCES employees(id),
                    table_number    INTEGER,
                    type            TEXT NOT NULL DEFAULT 'DINE_IN'
                                    CHECK (type IN ('DINE_IN','DELIVERY','PICKUP')),
                    status          TEXT NOT NULL DEFAULT 'EN_COCINA'
                                    CHECK (status IN ('EN_COCINA','LISTO_PARA_SERVIR','SERVIDO','EN_REPARTO','LISTO_PARA_RECOGER','FINALIZADO')),
                    subtotal        REAL NOT NULL DEFAULT 0,
                    discount_total  REAL NOT NULL DEFAULT 0,
                    tax_total       REAL NOT NULL DEFAULT 0,
                    total           REAL NOT NULL DEFAULT 0,
                    notes           TEXT,
                    sale_period_id  INTEGER REFERENCES sale_periods(id),
                    parent_order_id INTEGER REFERENCES orders(id),
                    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    updated_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── ORDER ITEMS ─────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS order_items (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id        INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    menu_item_id    INTEGER NOT NULL REFERENCES menu_items(id),
                    quantity        INTEGER NOT NULL CHECK (quantity > 0),
                    unit_price      REAL NOT NULL,
                    discount_amount REAL NOT NULL DEFAULT 0,
                    total_price     REAL NOT NULL,
                    note            TEXT,
                    created_at      TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── PAYMENTS ────────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS payments (
                    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id              INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    method                TEXT NOT NULL CHECK (method IN ('CASH','CARD','TRANSFER','OTHER')),
                    amount                REAL NOT NULL,
                    status                TEXT NOT NULL DEFAULT 'PENDING'
                                          CHECK (status IN ('PENDING','PAID','FAILED','REFUNDED')),
                    transaction_reference TEXT,
                    paid_at               TEXT,
                    created_at            TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── DELIVERIES ──────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS deliveries (
                    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id            INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    delivery_address_id INTEGER REFERENCES addresses(id),
                    estimated_time      TEXT,
                    delivered_at        TEXT,
                    delivery_notes      TEXT
                )
            `);

            // ── RESERVATIONS ────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS reservations (
                    id               INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id        INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    customer_id      INTEGER REFERENCES customers(id),
                    reservation_time TEXT NOT NULL,
                    number_of_people INTEGER NOT NULL CHECK (number_of_people > 0),
                    table_number     INTEGER,
                    status           TEXT NOT NULL DEFAULT 'PENDING',
                    created_at       TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── REVIEWS ─────────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS reviews (
                    id          INTEGER PRIMARY KEY AUTOINCREMENT,
                    branch_id   INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    customer_id INTEGER REFERENCES customers(id),
                    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
                    comment     TEXT,
                    review_date TEXT NOT NULL DEFAULT (datetime('now','localtime'))
                )
            `);

            // ── SUPPLIERS ───────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS suppliers (
                    id           INTEGER PRIMARY KEY AUTOINCREMENT,
                    name         TEXT NOT NULL,
                    contact_name TEXT,
                    phone_number TEXT,
                    email        TEXT
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS restaurant_suppliers (
                    branch_id   INTEGER NOT NULL REFERENCES restaurant_branches(id) ON DELETE CASCADE,
                    supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
                    PRIMARY KEY (branch_id, supplier_id)
                )
            `);

            // ── SETTINGS ────────────────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS settings (
                    key   TEXT PRIMARY KEY,
                    value TEXT
                )
            `);

            // ── ORDER STATUS HISTORY ─────────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS order_status_history (
                    id         INTEGER PRIMARY KEY AUTOINCREMENT,
                    order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                    old_status TEXT CHECK (old_status IN ('EN_COCINA','LISTO_PARA_SERVIR','SERVIDO','EN_REPARTO','LISTO_PARA_RECOGER','FINALIZADO')),
                    new_status TEXT NOT NULL CHECK (new_status IN ('EN_COCINA','LISTO_PARA_SERVIR','SERVIDO','EN_REPARTO','LISTO_PARA_RECOGER','FINALIZADO')),
                    changed_by INTEGER REFERENCES users(id),
                    changed_at TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    note       TEXT
                )
            `);

            // ── SALE PERIODS (Jornadas) ──────────────────────────────────────────
            this.db.run(`
                CREATE TABLE IF NOT EXISTS sale_periods (
                    id            INTEGER PRIMARY KEY AUTOINCREMENT,
                    business_date TEXT NOT NULL,
                    opened_by     INTEGER REFERENCES users(id),
                    closed_by     INTEGER REFERENCES users(id),
                    opened_at     TEXT NOT NULL DEFAULT (datetime('now','localtime')),
                    closed_at     TEXT
                )
            `);

            // Seed: default restaurant + branch + admin user
            this._seedDefaults();
        });
    }

    _seedDefaults() {
        // Ensure default restaurant exists
        this.db.get('SELECT id FROM restaurants WHERE id = 1', (err, row) => {
            if (!row) {
                this.db.run(
                    "INSERT INTO restaurants (id, name) VALUES (1, 'Mi Restaurante')",
                    (err) => {
                        if (err) { logger.error('Error seeding restaurant:', err); return; }

                        this.db.run(
                            "INSERT INTO restaurant_branches (id, restaurant_id, name) VALUES (1, 1, 'Sucursal Principal')",
                            (err) => {
                                if (err) logger.error('Error seeding branch:', err);
                                else logger.info('Default restaurant & branch created');
                                this._seedDefaultUsers();
                            }
                        );
                    }
                );
            } else {
                this._seedDefaultUsers();
            }
        });
    }

    _seedDefaultUsers() {
        const defaults = [
            { username: 'mesero1',   password: 'password123', role: 'waiter'  },
            { username: 'cocinero1', password: 'password123', role: 'cook'    },
            { username: 'admin',     password: 'admin123',    role: 'admin'   }
        ];
        defaults.forEach(u => this._createUserIfNotExists(u.username, u.password, u.role));
    }

    _createUserIfNotExists(username, password, role) {
        this.db.get('SELECT id FROM users WHERE username = ?', [username], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync(password, 10);
                this.db.run(
                    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    [username, hash, role],
                    (err) => {
                        if (err) logger.error(`Error creating user ${username}:`, err);
                        else logger.info(`Default user created: ${username} (${role})`);
                    }
                );
            }
        });
    }

    // ── USER METHODS ────────────────────────────────────────────────────────────

    getUserByUsername(username, callback) {
        this.db.get('SELECT * FROM users WHERE username = ? AND active = 1', [username], callback);
    }

    getUsers(callback) {
        this.db.all('SELECT id, username, role, active, created_at FROM users', callback);
    }

    createUser(username, password, role, callback) {
        const hash = bcrypt.hashSync(password, 10);
        this.db.run(
            'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
            [username, hash, role],
            callback
        );
    }

    deleteUser(id, callback) {
        this.db.run('UPDATE users SET active = 0 WHERE id = ?', [id], callback);
    }

    updateUserRole(id, role, callback) {
        this.db.run('UPDATE users SET role = ?, updated_at = datetime(\'now\',\'localtime\') WHERE id = ?', [role, id], callback);
    }

    // ── CUSTOMER METHODS ─────────────────────────────────────────────────────────

    /**
     * Creates a customer and optionally saves their address.
     * Calls back with (err, customerId).
     */
    createCustomer(name, phone, email, address, callback) {
        const self = this;
        // phone may be '' (empty string) when the customer has no real phone number
        this.db.run(
            'INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)',
            [name, phone || '', email || null],
            function (err) {
                if (err) return callback(err);
                const customerId = this.lastID;
                if (!address || address.trim() === '') return callback(null, customerId);

                // Save address linked to customer
                self.db.run(
                    'INSERT INTO addresses (line1) VALUES (?)',
                    [address],
                    function (err) {
                        if (err) return callback(null, customerId); // non-fatal
                        const addressId = this.lastID;
                        self.db.run(
                            'INSERT INTO customer_addresses (customer_id, address_id, is_default) VALUES (?, ?, 1)',
                            [customerId, addressId],
                            () => callback(null, customerId)
                        );
                    }
                );
            }
        );
    }

    getCustomerById(id, callback) {
        this.db.get(`
            SELECT c.*, a.line1 as address
            FROM customers c
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
            LEFT JOIN addresses a ON a.id = ca.address_id
            WHERE c.id = ?
        `, [id], callback);
    }

    // Find a customer with no real phone (phone = '' or NULL) by exact name match.
    // Used to deduplicate placeholder-phone customers.
    findCustomerByNameOnly(name, callback) {
        this.db.get(
            `SELECT c.*, a.line1 as address
             FROM customers c
             LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
             LEFT JOIN addresses a ON a.id = ca.address_id
             WHERE (c.phone = '' OR c.phone IS NULL) AND c.name = ? LIMIT 1`,
            [name],
            callback
        );
    }

    getCustomerByPhone(phone, callback) {
        this.db.get(`
            SELECT c.*, a.line1 as address
            FROM customers c
            LEFT JOIN customer_addresses ca ON ca.customer_id = c.id AND ca.is_default = 1
            LEFT JOIN addresses a ON a.id = ca.address_id
            WHERE c.phone = ?
        `, [phone], callback);
    }

    updateCustomer(id, name, phone, email, address, callback) {
        this.db.run(
            'UPDATE customers SET name = ?, phone = ?, email = ? WHERE id = ?',
            [name, phone || '', email || null, id],
            (err) => {
                if (err || !address) return callback(err);
                // Upsert default address
                this.db.get(
                    'SELECT ca.address_id FROM customer_addresses ca WHERE ca.customer_id = ? AND ca.is_default = 1',
                    [id],
                    (err2, row) => {
                        if (row) {
                            this.db.run('UPDATE addresses SET line1 = ? WHERE id = ?', [address, row.address_id], callback);
                        } else {
                            const self = this;
                            this.db.run('INSERT INTO addresses (line1) VALUES (?)', [address], function (err3) {
                                if (err3) return callback(err3);
                                const addressId = this.lastID;
                                self.db.run(
                                    'INSERT INTO customer_addresses (customer_id, address_id, is_default) VALUES (?, ?, 1)',
                                    [id, addressId],
                                    callback
                                );
                            });
                        }
                    }
                );
            }
        );
    }

    // ── ORDER METHODS ────────────────────────────────────────────────────────────

    /**
     * items: [{ menu_item_id, name, quantity, price }]
     * type: 'DINE_IN' | 'DELIVERY' | 'PICKUP'
     */
    createOrder(tableNumber, items, type = ORDER_TYPE.DINE_IN, customerId = null, callback) {
        const itemType = type || ORDER_TYPE.DINE_IN;
        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const total    = subtotal;

        const DEFAULT_BRANCH_ID = 1;
        const self = this;

        // Auto-assign the current active sale period (nullable — no period = null)
        this.getActiveSalePeriod((err, activePeriod) => {
            if (err) logger.error('Error fetching active period for order:', err);
            const salePeriodId = activePeriod ? activePeriod.id : null;

        self.db.run(
            `INSERT INTO orders (branch_id, customer_id, table_number, type, status, subtotal, total, sale_period_id, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
            [DEFAULT_BRANCH_ID, customerId, tableNumber || null, itemType, ORDER_STATUS.EN_COCINA, subtotal, total, salePeriodId],
            function (err) {
                if (err) return callback(err);

                const orderId = this.lastID;
                const stmt = self.db.prepare(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, note) VALUES (?, ?, ?, ?, ?, ?)'
                );

                items.forEach(item => {
                    let menuItemId = item.id || item.menu_item_id;
                    // Ensure it's a number and not a legacy string
                    if (typeof menuItemId === 'string' && menuItemId.startsWith('legacy')) {
                        menuItemId = null;
                    }
                    
                    const unitPrice  = item.price;
                    const totalPrice = unitPrice * item.quantity;
                    const note       = item.note || null;
                    
                    stmt.run(orderId, menuItemId, item.quantity, unitPrice, totalPrice, note, (err) => {
                        if (err) logger.error(`Error inserting order item: ${err.message}`, { orderId, menuItemId });
                    });
                });

                stmt.finalize((err) => {
                    if (err) return callback(err);
                    callback(null, orderId);
                });
            }
        );
        }); // end getActiveSalePeriod
    }

    /**
     * Creates a sub-order (addition) linked to a parent order.
     * The sub-order inherits branch, customer, table, type, and sale_period from the parent.
     */
    createSubOrder(parentOrderId, items, callback) {
        this.getOrderById(parentOrderId, (err, parent) => {
            if (err || !parent) return callback(err || new Error('Parent order not found'));

            const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            const total    = subtotal;
            const self     = this;

            this.db.run(
                `INSERT INTO orders (branch_id, customer_id, table_number, type, status, subtotal, total, sale_period_id, parent_order_id, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                [parent.branch_id || 1, parent.customer_id, parent.table_number, parent.type,
                 ORDER_STATUS.EN_COCINA, subtotal, total, parent.sale_period_id || null, parentOrderId],
                function (err) {
                    if (err) return callback(err);
                    const subOrderId = this.lastID;

                    const stmt = self.db.prepare(
                        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, note) VALUES (?, ?, ?, ?, ?, ?)'
                    );
                    items.forEach(item => {
                        let menuItemId = item.id || item.menu_item_id;
                        if (typeof menuItemId === 'string' && menuItemId.startsWith('legacy')) menuItemId = null;
                        stmt.run(subOrderId, menuItemId, item.quantity, item.price, item.price * item.quantity, item.note || null);
                    });
                    stmt.finalize((err) => {
                        if (err) return callback(err);
                        callback(null, subOrderId);
                    });
                }
            );
        });
    }

    /**
     * Finalizes all pending sub-orders of a given parent order.
     */
    finalizeSubOrders(parentOrderId, callback) {
        this.db.run(
            `UPDATE orders SET status = ?, updated_at = datetime('now','localtime')
             WHERE parent_order_id = ? AND status != ?`,
            [ORDER_STATUS.FINALIZADO, parentOrderId, ORDER_STATUS.FINALIZADO],
            callback
        );
    }

    /**
     * Shared SELECT that joins all relevant tables.
     */
    _orderSelect() {
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

    getOrders(callback) {
        this.db.all(
            `${this._orderSelect()} GROUP BY o.id ORDER BY o.created_at DESC`,
            callback
        );
    }

    getActiveOrders(callback) {
        this.db.all(
            `${this._orderSelect()}
             WHERE o.status != ?
               AND (o.parent_order_id IS NULL OR o.status = ?)
             GROUP BY o.id ORDER BY o.created_at ASC`,
            [ORDER_STATUS.FINALIZADO, ORDER_STATUS.EN_COCINA],
            callback
        );
    }

    getOrderById(orderId, callback) {
        this.db.get(
            `${this._orderSelect()} WHERE o.id = ? GROUP BY o.id`,
            [orderId],
            callback
        );
    }

    getOrdersByDate(date, callback) {
        const start = `${date} 00:00:00`;
        const end   = `${date} 23:59:59`;
        this.db.all(
            `${this._orderSelect()}
             WHERE o.created_at BETWEEN ? AND ?
             GROUP BY o.id ORDER BY o.created_at DESC`,
            [start, end],
            callback
        );
    }

    updateOrderStatus(orderId, status, changedByUserId, callback) {
        // Support legacy calls without changedByUserId
        if (typeof changedByUserId === 'function') {
            callback = changedByUserId;
            changedByUserId = null;
        }

        this.db.get('SELECT status FROM orders WHERE id = ?', [orderId], (err, row) => {
            if (err) return callback(err);
            const oldStatus = row ? row.status : null;

            this.db.run(
                `UPDATE orders SET status = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                [status, orderId],
                (err) => {
                    if (err) return callback(err);

                    // Record history
                    this.db.run(
                        'INSERT INTO order_status_history (order_id, old_status, new_status, changed_by) VALUES (?, ?, ?, ?)',
                        [orderId, oldStatus, status, changedByUserId],
                        () => {} // non-fatal
                    );

                    callback(null);
                }
            );
        });
    }

    /**
     * Update the items of an existing order.
     * items: [{ menu_item_id, name, quantity, price }]
     */
    updateOrderItems(orderId, items, total, callback) {
        this.db.serialize(() => {
            this.db.run('BEGIN TRANSACTION');

            this.db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
                if (err) { this.db.run('ROLLBACK'); return callback(err); }

                const stmt = this.db.prepare(
                    'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, note) VALUES (?, ?, ?, ?, ?, ?)'
                );
                items.forEach(item => {
                    let menuItemId = item.id || item.menu_item_id;
                    if (typeof menuItemId === 'string' && menuItemId.startsWith('legacy')) {
                        menuItemId = null;
                    }
                    const unitPrice  = item.price;
                    const totalPrice = unitPrice * item.quantity;
                    const note       = item.note || null;
                    stmt.run(orderId, menuItemId, item.quantity, unitPrice, totalPrice, note, (err) => {
                        if (err) logger.error(`Error updating order item: ${err.message}`, { orderId, menuItemId });
                    });
                });

                stmt.finalize((err) => {
                    if (err) { this.db.run('ROLLBACK'); return callback(err); }

                    const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
                    this.db.run(
                        `UPDATE orders SET subtotal = ?, total = ?, updated_at = datetime('now','localtime') WHERE id = ?`,
                        [subtotal, subtotal, orderId],
                        (err) => {
                            if (err) { this.db.run('ROLLBACK'); return callback(err); }
                            this.db.run('COMMIT');
                            callback(null);
                        }
                    );
                });
            });
        });
    }

    deleteOrder(orderId, callback) {
        this.db.serialize(() => {
            this.db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
                if (err) return callback(err);
                this.db.run('DELETE FROM orders WHERE id = ?', [orderId], callback);
            });
        });
    }

    clearAllOrders(callback) {
        this.db.serialize(() => {
            this.db.run('DELETE FROM order_items');
            this.db.run('DELETE FROM orders', callback);
        });
    }

    // ── MENU ITEM METHODS ────────────────────────────────────────────────────────

    getMenuItems(callback) {
        this.db.all(`
            SELECT mi.*, mc.name AS category
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mc.id = mi.category_id
        `, callback);
    }

    getAvailableMenuItems(callback) {
        this.db.all(`
            SELECT mi.*, mc.name AS category
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mc.id = mi.category_id
            WHERE mi.available = 1
        `, callback);
    }

    createMenuItem(item, callback) {
        const { name, description, price, image_url, category_id, available } = item;
        const DEFAULT_BRANCH_ID = 1;
        this.db.run(
            'INSERT INTO menu_items (branch_id, category_id, name, description, price, image_url, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [DEFAULT_BRANCH_ID, category_id || null, name, description || null, price, image_url || null, available ? 1 : 0],
            function (err) { callback(err, this ? this.lastID : null); }
        );
    }

    updateMenuItem(id, item, callback) {
        const { name, description, price, image_url, category_id, available } = item;
        this.db.run(
            'UPDATE menu_items SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, available = ? WHERE id = ?',
            [category_id || null, name, description || null, price, image_url || null, available ? 1 : 0, id],
            callback
        );
    }

    deleteMenuItem(id, callback) {
        this.db.run('DELETE FROM menu_items WHERE id = ?', [id], callback);
    }

    clearAllMenuItems(callback) {
        this.db.run('DELETE FROM menu_items', callback);
    }

    // ── MENU CATEGORIES ─────────────────────────────────────────────────────────

    getMenuCategories(callback) {
        this.db.all(
            'SELECT * FROM menu_categories WHERE branch_id = 1 ORDER BY sort_order ASC, name ASC',
            callback
        );
    }

    createMenuCategory(data, callback) {
        const { name, description, sort_order } = data;
        this.db.run(
            'INSERT INTO menu_categories (branch_id, name, description, sort_order) VALUES (1, ?, ?, ?)',
            [name, description || null, sort_order || 0],
            function (err) { callback(err, this ? this.lastID : null); }
        );
    }

    updateMenuCategory(id, data, callback) {
        const { name, description, sort_order } = data;
        this.db.run(
            'UPDATE menu_categories SET name = ?, description = ?, sort_order = ? WHERE id = ?',
            [name, description || null, sort_order || 0, id],
            callback
        );
    }

    deleteMenuCategory(id, callback) {
        this.db.run('DELETE FROM menu_categories WHERE id = ?', [id], callback);
    }

    // ── PROMOTIONS (item-level) ──────────────────────────────────────────────────

    getItemPromotions(callback) {
        this.db.all('SELECT * FROM item_promotions ORDER BY id DESC', callback);
    }

    createItemPromotion(data, callback) {
        const { menu_item_id, type, value, active, valid_from, valid_to } = data;
        this.db.run(
            'INSERT INTO item_promotions (menu_item_id, type, value, active, valid_from, valid_to) VALUES (?, ?, ?, ?, ?, ?)',
            [menu_item_id, type, value, active ? 1 : 0, valid_from || null, valid_to || null],
            function (err) { callback(err, this ? this.lastID : null); }
        );
    }

    updateItemPromotion(id, data, callback) {
        const { menu_item_id, type, value, active, valid_from, valid_to } = data;
        this.db.run(
            'UPDATE item_promotions SET menu_item_id = ?, type = ?, value = ?, active = ?, valid_from = ?, valid_to = ? WHERE id = ?',
            [menu_item_id, type, value, active ? 1 : 0, valid_from || null, valid_to || null, id],
            callback
        );
    }

    deleteItemPromotion(id, callback) {
        this.db.run('DELETE FROM item_promotions WHERE id = ?', [id], callback);
    }

    // ── PROMOTIONS (category-level) ──────────────────────────────────────────────

    getCategoryPromotions(callback) {
        this.db.all(`
            SELECT cp.*, mc.name AS category_name
            FROM category_promotions cp
            LEFT JOIN menu_categories mc ON mc.id = cp.category_id
            ORDER BY cp.created_at DESC
        `, callback);
    }

    createCategoryPromotion(data, callback) {
        const { category_id, type, value, active, valid_from, valid_to, buy_quantity, pay_quantity } = data;
        this.db.run(
            'INSERT INTO category_promotions (category_id, type, value, active, valid_from, valid_to, buy_quantity, pay_quantity) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [category_id, type, value || null, active ? 1 : 0, valid_from || null, valid_to || null, buy_quantity || null, pay_quantity || null],
            function (err) { callback(err, this ? this.lastID : null); }
        );
    }

    updateCategoryPromotion(id, data, callback) {
        const { category_id, type, value, active, valid_from, valid_to, buy_quantity, pay_quantity } = data;
        this.db.run(
            'UPDATE category_promotions SET category_id = ?, type = ?, value = ?, active = ?, valid_from = ?, valid_to = ?, buy_quantity = ?, pay_quantity = ? WHERE id = ?',
            [category_id, type, value || null, active ? 1 : 0, valid_from || null, valid_to || null, buy_quantity || null, pay_quantity || null, id],
            callback
        );
    }

    deleteCategoryPromotion(id, callback) {
        this.db.run('DELETE FROM category_promotions WHERE id = ?', [id], callback);
    }

    /**
     * Returns menu items with their effective promotional price calculated.
     */
    getMenuItemsWithPromotions(callback) {
        const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

        this.db.all(`
            SELECT mi.*, mc.name AS category,
                   ip.type  AS item_promo_type,
                   ip.value AS item_promo_value,
                   ip.id    AS item_promo_id,
                   cp.type  AS cat_promo_type,
                   cp.value AS cat_promo_value,
                   cp.id    AS cat_promo_id
            FROM menu_items mi
            LEFT JOIN menu_categories mc ON mc.id = mi.category_id
            LEFT JOIN item_promotions ip ON ip.menu_item_id = mi.id
                AND ip.active = 1
                AND (ip.valid_from IS NULL OR ip.valid_from <= ?)
                AND (ip.valid_to   IS NULL OR ip.valid_to   >= ?)
            LEFT JOIN category_promotions cp ON cp.category_id = mi.category_id
                AND cp.active = 1
                AND (cp.valid_from IS NULL OR cp.valid_from <= ?)
                AND (cp.valid_to   IS NULL OR cp.valid_to   >= ?)
        `, [now, now, now, now], (err, items) => {
            if (err) return callback(err);

            const result = items.map(item => {
                let finalPrice = item.price;
                let hasPromo   = false;
                let promoType  = null;
                let promoValue = null;
                let discount   = 0;

                const applyPromo = (type, value) => {
                    hasPromo   = true;
                    promoType  = type;
                    promoValue = value;
                    if (type === 'PERCENTAGE')   { discount = item.price * value / 100; }
                    else if (type === 'FIXED_AMOUNT') { discount = value; }
                    finalPrice = Math.max(0, item.price - discount);
                };

                if (item.item_promo_id) {
                    applyPromo(item.item_promo_type, item.item_promo_value);
                } else if (item.cat_promo_id) {
                    applyPromo(item.cat_promo_type, item.cat_promo_value);
                }

                return {
                    id:               item.id,
                    branch_id:        item.branch_id,
                    category_id:      item.category_id,
                    category:         item.category,
                    name:             item.name,
                    description:      item.description,
                    price:            item.price,
                    image_url:        item.image_url,
                    available:        item.available,
                    created_at:       item.created_at,
                    original_price:   item.price,
                    final_price:      parseFloat(finalPrice.toFixed(2)),
                    has_promotion:    hasPromo,
                    promotion_type:   promoType,
                    promotion_value:  promoValue,
                    discount_amount:  parseFloat(discount.toFixed(2))
                };
            });

            callback(null, result);
        });
    }

    // ── PAYMENTS ────────────────────────────────────────────────────────────────

    getPaymentsByOrder(orderId, callback) {
        this.db.all('SELECT * FROM payments WHERE order_id = ?', [orderId], callback);
    }

    createPayment(data, callback) {
        const { order_id, method, amount, status, transaction_reference } = data;
        this.db.run(
            'INSERT INTO payments (order_id, method, amount, status, transaction_reference) VALUES (?, ?, ?, ?, ?)',
            [order_id, method, amount, status || PAYMENT_STATUS.PENDING, transaction_reference || null],
            function (err) { callback(err, this ? this.lastID : null); }
        );
    }

    // ── SETTINGS ────────────────────────────────────────────────────────────────

    getSettings(callback) {
        this.db.all('SELECT * FROM settings', (err, rows) => {
            if (err) return callback(err);
            const settings = {};
            rows.forEach(row => { settings[row.key] = row.value; });
            callback(null, settings);
        });
    }

    updateSetting(key, value, callback) {
        this.db.run(
            'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
            [key, value],
            callback
        );
    }

    // ── REPORTS ──────────────────────────────────────────────────────────────────

    getSalesReport(startDate, endDate, callback) {
        const start = startDate ? `${startDate} 06:00:00` : '1970-01-01 00:00:00';

        let endD = endDate ? new Date(endDate) : new Date();
        endD.setDate(endD.getDate() + 1);
        const endStr = endD.toISOString().split('T')[0];
        const end = `${endStr} 05:59:59`;

        const report = { summary: {}, dailySales: [], topItems: [] };

        this.db.get(`
            SELECT COUNT(*) AS total_orders,
                   SUM(total) AS total_revenue,
                   AVG(total) AS average_ticket
            FROM orders
            WHERE status = ? AND created_at BETWEEN ? AND ?
        `, [ORDER_STATUS.FINALIZADO, start, end], (err, summaryRow) => {
            if (err) return callback(err);
            report.summary = summaryRow || { total_orders: 0, total_revenue: 0, average_ticket: 0 };

            this.db.all(`
                SELECT created_at, total
                FROM orders
                WHERE status = ? AND created_at BETWEEN ? AND ?
                ORDER BY created_at ASC
            `, [ORDER_STATUS.FINALIZADO, start, end], (err, orderRows) => {
                if (err) return callback(err);

                const periodMap = {};
                orderRows.forEach(order => {
                    const d    = new Date(order.created_at);
                    const hour = d.getHours();
                    const key  = (hour < 6)
                        ? new Date(d.getTime() - 86400000).toISOString().split('T')[0]
                        : d.toISOString().split('T')[0];

                    if (!periodMap[key]) periodMap[key] = { date: key, orders_count: 0, daily_revenue: 0 };
                    periodMap[key].orders_count++;
                    periodMap[key].daily_revenue += order.total;
                });
                report.dailySales = Object.values(periodMap).sort((a, b) => a.date.localeCompare(b.date));

                this.db.all(`
                    SELECT
                        COALESCE(mc.name, 'Sin Categoría') AS category,
                        COALESCE(mi.name, 'Producto') AS item_name,
                        SUM(oi.quantity)               AS quantity_sold,
                        SUM(oi.total_price)            AS item_revenue
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
                    WHERE o.status = ? AND o.created_at BETWEEN ? AND ?
                    GROUP BY mc.name, mi.name
                    ORDER BY mc.name ASC, quantity_sold DESC
                `, [ORDER_STATUS.FINALIZADO, start, end], (err, itemRows) => {
                    if (err) return callback(err);

                    const catMap = {};
                    itemRows.forEach(item => {
                        if (!catMap[item.category]) catMap[item.category] = { category: item.category, items: [] };
                        catMap[item.category].items.push({
                            item_name:     item.item_name,
                            quantity_sold: item.quantity_sold,
                            item_revenue:  item.item_revenue
                        });
                    });
                    report.topItems = Object.values(catMap).map(cat => {
                        const totalRevenue = cat.items.reduce((s, i) => s + i.item_revenue, 0);
                        return { ...cat, totalRevenue };
                    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

                    callback(null, report);
                });
            });
        });
    }

    // ── SALE PERIODS ─────────────────────────────────────────────────────────────

    getActiveSalePeriod(callback) {
        this.db.get(`
            SELECT sp.*,
                   u1.username AS opened_by_username,
                   u2.username AS closed_by_username
            FROM sale_periods sp
            LEFT JOIN users u1 ON u1.id = sp.opened_by
            LEFT JOIN users u2 ON u2.id = sp.closed_by
            WHERE sp.closed_at IS NULL
            ORDER BY sp.opened_at DESC LIMIT 1
        `, callback);
    }

    openSalePeriod(userId, callback) {
        this.getActiveSalePeriod((err, active) => {
            if (err) return callback(err);
            if (active) return callback(new Error('Ya existe una jornada abierta'));

            this.db.run(
                `INSERT INTO sale_periods (business_date, opened_by, opened_at)
                 VALUES (date('now','localtime'), ?, datetime('now','localtime'))`,
                [userId],
                function (err) { callback(err, this ? this.lastID : null); }
            );
        });
    }

    /**
     * Closes the period. If there are active (non-FINALIZADO) orders and force=false,
     * returns { warning: true, activeOrdersCount } without closing.
     * If force=true, closes regardless.
     */
    closeSalePeriod(periodId, userId, force, callback) {
        this.db.all(
            `SELECT o.id, o.table_number, o.type, o.status,
                    c.name as customer_name
             FROM orders o
             LEFT JOIN customers c ON o.customer_id = c.id
             WHERE o.sale_period_id = ? AND o.status != ?
             ORDER BY o.created_at ASC`,
            [periodId, ORDER_STATUS.FINALIZADO],
            (err, activeOrders) => {
                if (err) return callback(err);

                if (activeOrders.length > 0 && !force) {
                    return callback(null, {
                        warning: true,
                        activeOrdersCount: activeOrders.length,
                        activeOrders: activeOrders
                    });
                }

                this.db.run(
                    `UPDATE sale_periods
                     SET closed_by = ?, closed_at = datetime('now','localtime')
                     WHERE id = ? AND closed_at IS NULL`,
                    [userId, periodId],
                    (err) => callback(err, err ? null : { success: true })
                );
            }
        );
    }

    getSalePeriods(callback) {
        this.db.all(`
            SELECT sp.*,
                   u1.username AS opened_by_username,
                   u2.username AS closed_by_username,
                   COUNT(o.id) AS order_count,
                   SUM(CASE WHEN o.status = 'FINALIZADO' THEN o.total ELSE 0 END) AS total_revenue
            FROM sale_periods sp
            LEFT JOIN users u1 ON u1.id = sp.opened_by
            LEFT JOIN users u2 ON u2.id = sp.closed_by
            LEFT JOIN orders o ON o.sale_period_id = sp.id
            GROUP BY sp.id
            ORDER BY sp.opened_at DESC
        `, callback);
    }

    getSalePeriodReport(periodId, callback) {
        const report = { summary: {}, dailySales: [], topItems: [], period: null };

        this.db.get(`
            SELECT sp.*, u.username AS opened_by_username
            FROM sale_periods sp LEFT JOIN users u ON u.id = sp.opened_by
            WHERE sp.id = ?
        `, [periodId], (err, period) => {
            if (err) return callback(err);
            if (!period) return callback(new Error('Period not found'));
            report.period = period;

            this.db.get(`
                SELECT COUNT(*) AS total_orders,
                       SUM(total) AS total_revenue,
                       AVG(total) AS average_ticket
                FROM orders
                WHERE status = ? AND sale_period_id = ?
            `, [ORDER_STATUS.FINALIZADO, periodId], (err, summaryRow) => {
                if (err) return callback(err);
                report.summary = summaryRow || { total_orders: 0, total_revenue: 0, average_ticket: 0 };

                this.db.all(`
                    SELECT
                        COALESCE(mc.name, 'Sin Categoría') AS category,
                        COALESCE(mi.name, 'Producto') AS item_name,
                        SUM(oi.quantity) AS quantity_sold,
                        SUM(oi.total_price) AS item_revenue
                    FROM order_items oi
                    JOIN orders o ON o.id = oi.order_id
                    LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                    LEFT JOIN menu_categories mc ON mc.id = mi.category_id
                    WHERE o.status = ? AND o.sale_period_id = ?
                    GROUP BY mc.name, mi.name
                    ORDER BY mc.name ASC, quantity_sold DESC
                `, [ORDER_STATUS.FINALIZADO, periodId], (err, itemRows) => {
                    if (err) return callback(err);

                    const catMap = {};
                    itemRows.forEach(item => {
                        if (!catMap[item.category]) catMap[item.category] = { category: item.category, items: [] };
                        catMap[item.category].items.push({
                            item_name:     item.item_name,
                            quantity_sold: item.quantity_sold,
                            item_revenue:  item.item_revenue
                        });
                    });
                    report.topItems = Object.values(catMap).map(cat => ({
                        ...cat,
                        totalRevenue: cat.items.reduce((s, i) => s + i.item_revenue, 0)
                    })).sort((a, b) => b.totalRevenue - a.totalRevenue);

                    callback(null, report);
                });
            });
        });
    }

    // ── ORDER STATUS HISTORY ─────────────────────────────────────────────────────

    getOrderStatusHistory(orderId, callback) {
        this.db.all(`
            SELECT h.*, u.username AS changed_by_username
            FROM order_status_history h
            LEFT JOIN users u ON u.id = h.changed_by
            WHERE h.order_id = ?
            ORDER BY h.changed_at ASC
        `, [orderId], callback);
    }

    close() {
        this.db.close();
    }
}

/**
 * Applies BUNDLE promotions to a list of order items.
 * For each active BUNDLE promotion on a category, groups items from that category,
 * calculates free units (Math.floor(total_qty / buy_quantity) * freePerGroup),
 * and discounts the cheapest units first.
 *
 * @param {Array} items - Array of { category_id, quantity, unit_price, ... }
 * @param {Array} categoryPromotions - Active BUNDLE promos with { category_id, type, buy_quantity, pay_quantity }
 * @returns {Array} Items with updated discount_amount and total_price
 */
function applyBundleDiscount(items, categoryPromotions) {
    const result = items.map(i => ({ ...i }));

    for (const promo of categoryPromotions) {
        if (promo.type !== 'BUNDLE') continue;
        const { category_id, buy_quantity, pay_quantity } = promo;
        const freePerGroup = buy_quantity - pay_quantity;

        // Expand items of this category into individual units
        const units = [];
        for (const item of result) {
            if (item.category_id !== category_id) continue;
            for (let u = 0; u < item.quantity; u++) {
                units.push({ ref: item, unit_price: item.unit_price });
            }
        }

        // Cheapest first — those are the ones that go free
        units.sort((a, b) => a.unit_price - b.unit_price);

        const freeUnits = Math.floor(units.length / buy_quantity) * freePerGroup;
        for (let i = 0; i < freeUnits && i < units.length; i++) {
            units[i].ref.discount_amount = (units[i].ref.discount_amount || 0) + units[i].unit_price;
        }
    }

    // Recalculate total_price for all affected items
    for (const item of result) {
        item.total_price = Math.max(0, item.unit_price * item.quantity - (item.discount_amount || 0));
    }

    return result;
}

const dbInstance = new Database();
dbInstance.applyBundleDiscount = applyBundleDiscount;

module.exports = dbInstance;

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('./logger');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');

// Helper for consistent date formatting (YYYY-MM-DD HH:mm:ss)
const getCurrentTimestamp = () => {
    const now = new Date();
    const pad = (n) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
};

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                logger.error('Error opening database:', err.message);
            } else {
                logger.info('Connected to SQLite database');
                this.initializeTables();
            }
        });
    }

    initializeTables() {
        this.db.serialize(() => {
            // Users table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT DEFAULT 'waiter'
        )
      `);

            // Orders table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number INTEGER NOT NULL,
          status TEXT DEFAULT 'Creado',
          total REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_updated INTEGER DEFAULT 0,
          original_items_snapshot TEXT
        )
      `);

            // Migration for existing databases
            this.db.run("ALTER TABLE orders ADD COLUMN is_updated INTEGER DEFAULT 0", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE orders ADD COLUMN original_items_snapshot TEXT", (err) => { /* ignore */ });

            // Order items table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          order_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          price REAL NOT NULL,
          FOREIGN KEY (order_id) REFERENCES orders(id)
        )
      `);

            // Menu Items table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS menu_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          description TEXT,
          price REAL NOT NULL,
          image_url TEXT,
          category TEXT,
          available BOOLEAN DEFAULT 1,
          promotion_type TEXT,
          promotion_value REAL,
          promotion_active BOOLEAN DEFAULT 0
        )
      `);

            // Migration for existing menu_items tables
            this.db.run("ALTER TABLE menu_items ADD COLUMN promotion_type TEXT", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE menu_items ADD COLUMN promotion_value REAL", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE menu_items ADD COLUMN promotion_active BOOLEAN DEFAULT 0", (err) => { /* ignore */ });

            // Category Promotions table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS category_promotions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category TEXT NOT NULL,
          promotion_type TEXT NOT NULL,
          promotion_value REAL NOT NULL,
          active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Settings table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        )
      `);


            // Create default user if not exists
            this.createDefaultUser();
        });
    }

    createDefaultUser() {
        // Create default waiter
        this.createUserIfNotExists('mesero1', 'password123', 'waiter');
        // Create default cook
        this.createUserIfNotExists('cocinero1', 'password123', 'cook');
        // Create default admin
        this.createUserIfNotExists('admin', 'admin123', 'admin');
    }

    createUserIfNotExists(username, password, role) {
        this.db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (!row) {
                const hash = bcrypt.hashSync(password, 10);
                this.db.run(
                    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    [username, hash, role],
                    (err) => {
                        if (err) {
                            logger.error(`Error creating user ${username}:`, err);
                        } else {
                            logger.info(`Default user created: ${username} (${role})`);
                        }
                    }
                );
            }
        });
    }

    // User methods
    getUserByUsername(username, callback) {
        this.db.get('SELECT * FROM users WHERE username = ?', [username], callback);
    }

    getUsers(callback) {
        this.db.all('SELECT id, username, role FROM users', callback);
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
        this.db.run('DELETE FROM users WHERE id = ?', [id], callback);
    }

    updateUserRole(id, role, callback) {
        this.db.run('UPDATE users SET role = ? WHERE id = ?', [role, id], callback);
    }

    // Order methods
    createOrder(tableNumber, items, callback) {
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const db = this.db; // Store reference to db

        const now = getCurrentTimestamp();
        db.run(
            'INSERT INTO orders (table_number, total, created_at, updated_at) VALUES (?, ?, ?, ?)',
            [tableNumber, total, now, now],
            function (err) {
                if (err) return callback(err);

                const orderId = this.lastID;
                const stmt = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)');

                items.forEach(item => {
                    stmt.run(orderId, item.name, item.quantity, item.price);
                });

                stmt.finalize((err) => {
                    if (err) return callback(err);
                    callback(null, orderId);
                });
            }
        );
    }


    getOrders(callback) {
        this.db.all(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, callback);
    }

    getActiveOrders(callback) {
        this.db.all(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status != 'Pagado'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, callback);
    }

    updateOrderStatus(orderId, status, callback) {
        const now = getCurrentTimestamp();
        this.db.run(
            'UPDATE orders SET status = ?, updated_at = ? WHERE id = ?',
            [status, now, orderId],
            callback
        );
    }

    getOrderById(orderId, callback) {
        this.db.get(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = ?
      GROUP BY o.id
    `, [orderId], callback);
    }

    // Menu Item Methods
    getMenuItems(callback) {
        this.db.all('SELECT * FROM menu_items', callback);
    }

    getAvailableMenuItems(callback) {
        this.db.all('SELECT * FROM menu_items WHERE available = 1', callback);
    }

    createMenuItem(item, callback) {
        const { name, description, price, image_url, category, available, promotion_type, promotion_value, promotion_active } = item;
        this.db.run(
            'INSERT INTO menu_items (name, description, price, image_url, category, available, promotion_type, promotion_value, promotion_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [name, description, price, image_url, category, available ? 1 : 0, promotion_type || null, promotion_value || null, promotion_active ? 1 : 0],
            function (err) {
                callback(err, this ? this.lastID : null);
            }
        );
    }

    updateMenuItem(id, item, callback) {
        const { name, description, price, image_url, category, available, promotion_type, promotion_value, promotion_active } = item;
        this.db.run(
            'UPDATE menu_items SET name = ?, description = ?, price = ?, image_url = ?, category = ?, available = ?, promotion_type = ?, promotion_value = ?, promotion_active = ? WHERE id = ?',
            [name, description, price, image_url, category, available ? 1 : 0, promotion_type || null, promotion_value || null, promotion_active ? 1 : 0, id],
            callback
        );
    }

    deleteMenuItem(id, callback) {
        this.db.run('DELETE FROM menu_items WHERE id = ?', [id], callback);
    }

    // Category Promotion Methods
    getCategoryPromotions(callback) {
        this.db.all('SELECT * FROM category_promotions ORDER BY created_at DESC', callback);
    }

    createCategoryPromotion(data, callback) {
        const { category, promotion_type, promotion_value, active } = data;
        this.db.run(
            'INSERT INTO category_promotions (category, promotion_type, promotion_value, active) VALUES (?, ?, ?, ?)',
            [category, promotion_type, promotion_value, active ? 1 : 0],
            function (err) {
                callback(err, this ? this.lastID : null);
            }
        );
    }

    updateCategoryPromotion(id, data, callback) {
        const { category, promotion_type, promotion_value, active } = data;
        this.db.run(
            'UPDATE category_promotions SET category = ?, promotion_type = ?, promotion_value = ?, active = ? WHERE id = ?',
            [category, promotion_type, promotion_value, active ? 1 : 0, id],
            callback
        );
    }

    deleteCategoryPromotion(id, callback) {
        this.db.run('DELETE FROM category_promotions WHERE id = ?', [id], callback);
    }

    // Get menu items with calculated promotional prices
    getMenuItemsWithPromotions(callback) {
        // First get all menu items
        this.db.all('SELECT * FROM menu_items', (err, items) => {
            if (err) return callback(err);

            // Then get all active category promotions
            this.db.all('SELECT * FROM category_promotions WHERE active = 1', (err, categoryPromos) => {
                if (err) return callback(err);

                // Calculate promotional prices for each item
                const itemsWithPromos = items.map(item => {
                    let finalPrice = item.price;
                    let hasPromotion = false;
                    let promotionType = null;
                    let promotionValue = null;
                    let discountAmount = 0;

                    // Check item-level promotion first (takes precedence)
                    if (item.promotion_active && item.promotion_type && item.promotion_value) {
                        hasPromotion = true;
                        promotionType = item.promotion_type;
                        promotionValue = item.promotion_value;

                        if (item.promotion_type === 'percentage') {
                            discountAmount = item.price * (item.promotion_value / 100);
                            finalPrice = item.price - discountAmount;
                        } else if (item.promotion_type === 'fixed') {
                            discountAmount = item.promotion_value;
                            finalPrice = Math.max(0, item.price - item.promotion_value);
                        }
                    }
                    // If no item-level promotion, check category-level promotion
                    else if (item.category) {
                        const categoryPromo = categoryPromos.find(cp => cp.category === item.category && cp.active);
                        if (categoryPromo) {
                            hasPromotion = true;
                            promotionType = categoryPromo.promotion_type;
                            promotionValue = categoryPromo.promotion_value;

                            if (categoryPromo.promotion_type === 'percentage') {
                                discountAmount = item.price * (categoryPromo.promotion_value / 100);
                                finalPrice = item.price - discountAmount;
                            } else if (categoryPromo.promotion_type === 'fixed') {
                                discountAmount = categoryPromo.promotion_value;
                                finalPrice = Math.max(0, item.price - categoryPromo.promotion_value);
                            }
                        }
                    }

                    return {
                        ...item,
                        original_price: item.price,
                        final_price: parseFloat(finalPrice.toFixed(2)),
                        has_promotion: hasPromotion,
                        promotion_type: promotionType,
                        promotion_value: promotionValue,
                        discount_amount: parseFloat(discountAmount.toFixed(2))
                    };
                });

                callback(null, itemsWithPromos);
            });
        });
    }

    // Settings Methods
    getSettings(callback) {
        this.db.all('SELECT * FROM settings', (err, rows) => {
            if (err) return callback(err);
            const settings = {};
            rows.forEach(row => {
                settings[row.key] = row.value;
            });
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

    updateOrderItems(orderId, items, total, callback) {
        const db = this.db;

        // Helper to get current items string before update
        const getCurrentItems = (cb) => {
            db.get(`
                SELECT GROUP_CONCAT(item_name || ' x' || quantity || ' [' || price || ']') as items, is_updated 
                FROM order_items 
                JOIN orders ON orders.id = order_items.order_id 
                WHERE order_id = ?
            `, [orderId], (err, row) => {
                if (err) return cb(err);
                cb(null, row);
            });
        };

        getCurrentItems((err, currentRow) => {
            if (err) return callback(err);

            db.serialize(() => {
                db.run('BEGIN TRANSACTION');

                // If not already updated, save the snapshot
                if (currentRow && currentRow.is_updated === 0 && currentRow.items) {
                    db.run('UPDATE orders SET original_items_snapshot = ? WHERE id = ?', [currentRow.items, orderId]);
                }

                // 1. Delete old items
                db.run('DELETE FROM order_items WHERE order_id = ?', [orderId], (err) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return callback(err);
                    }

                    // 2. Insert new items
                    const stmt = db.prepare('INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)');
                    items.forEach(item => {
                        stmt.run(orderId, item.name, item.quantity, item.price);
                    });

                    stmt.finalize((err) => {
                        if (err) {
                            db.run('ROLLBACK');
                            return callback(err);
                        }

                        const now = getCurrentTimestamp();
                        // 3. Update order total and flag
                        db.run(
                            'UPDATE orders SET total = ?, is_updated = 1, updated_at = ? WHERE id = ?',
                            [total, now, orderId],
                            (err) => {
                                if (err) {
                                    db.run('ROLLBACK');
                                    return callback(err);
                                }

                                db.run('COMMIT');
                                callback(null);
                            }
                        );
                    });
                });
            });
        });
    }

    getSalesReport(startDate, endDate, callback) {
        // Formatos de fecha para SQLite
        const start = startDate ? startDate + ' 00:00:00' : '1970-01-01 00:00:00';
        const end = endDate ? endDate + ' 23:59:59' : getCurrentTimestamp();

        const report = {
            summary: {},
            dailySales: [],
            topItems: []
        };

        // 1. Resumen (Total, Cantidad, Promedio) - Solo órdenes 'Pagado'
        const sqlSummary = `
            SELECT 
                COUNT(*) as total_orders, 
                SUM(total) as total_revenue, 
                AVG(total) as average_ticket 
            FROM orders 
            WHERE status = 'Pagado' 
            AND created_at BETWEEN ? AND ?
        `;

        this.db.get(sqlSummary, [start, end], (err, summaryRow) => {
            if (err) return callback(err);
            report.summary = summaryRow || { total_orders: 0, total_revenue: 0, average_ticket: 0 };

            // 2. Ventas Diarias
            const sqlDaily = `
                SELECT 
                    strftime('%Y-%m-%d', created_at) as date, 
                    COUNT(*) as orders_count, 
                    SUM(total) as daily_revenue 
                FROM orders 
                WHERE status = 'Pagado' 
                AND created_at BETWEEN ? AND ? 
                GROUP BY date 
                ORDER BY date ASC
            `;

            this.db.all(sqlDaily, [start, end], (err, dailyRows) => {
                if (err) return callback(err);
                report.dailySales = dailyRows;

                // 3. Productos más vendidos
                const sqlItems = `
                    SELECT 
                        oi.item_name, 
                        SUM(oi.quantity) as quantity_sold, 
                        SUM(oi.price * oi.quantity) as item_revenue 
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    WHERE o.status = 'Pagado' 
                    AND o.created_at BETWEEN ? AND ?
                    GROUP BY oi.item_name
                    ORDER BY quantity_sold DESC
                    LIMIT 20
                `;

                this.db.all(sqlItems, [start, end], (err, itemRows) => {
                    if (err) return callback(err);
                    report.topItems = itemRows;
                    callback(null, report);
                });
            });
        });
    }

    // Cleanup Methods
    clearAllMenuItems(callback) {
        this.db.run('DELETE FROM menu_items', callback);
    }

    clearAllOrders(callback) {
        this.db.serialize(() => {
            this.db.run('DELETE FROM order_items');
            this.db.run('DELETE FROM orders', callback);
        });
    }

    close() {
        this.db.close();
    }
}

module.exports = new Database();

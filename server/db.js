const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const { ORDER_STATUS } = require('./constants');

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

            // Customers table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS customers (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL,
          address TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

            // Orders table
            this.db.run(`
        CREATE TABLE IF NOT EXISTS orders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          table_number INTEGER,
          status TEXT DEFAULT 'PREPARANDO ORDEN',
          total REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_updated INTEGER DEFAULT 0,
          original_items_snapshot TEXT,
          is_delivery INTEGER DEFAULT 0,
          is_pickup INTEGER DEFAULT 0,
          customer_id INTEGER,
          FOREIGN KEY (customer_id) REFERENCES customers(id)
        )
      `);

            // Migration for existing databases
            this.db.run("ALTER TABLE orders ADD COLUMN is_updated INTEGER DEFAULT 0", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE orders ADD COLUMN original_items_snapshot TEXT", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE orders ADD COLUMN is_delivery INTEGER DEFAULT 0", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE orders ADD COLUMN is_pickup INTEGER DEFAULT 0", (err) => { /* ignore */ });
            this.db.run("ALTER TABLE orders ADD COLUMN customer_id INTEGER", (err) => { /* ignore */ });

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

    // Customer methods
    createCustomer(name, phone, address, callback) {
        const now = getCurrentTimestamp();
        this.db.run(
            'INSERT INTO customers (name, phone, address, created_at) VALUES (?, ?, ?, ?)',
            [name, phone, address, now],
            function (err) {
                callback(err, this ? this.lastID : null);
            }
        );
    }

    getCustomerById(id, callback) {
        this.db.get('SELECT * FROM customers WHERE id = ?', [id], callback);
    }

    getCustomerByPhone(phone, callback) {
        this.db.get('SELECT * FROM customers WHERE phone = ?', [phone], callback);
    }

    updateCustomer(id, name, phone, address, callback) {
        this.db.run(
            'UPDATE customers SET name = ?, phone = ?, address = ? WHERE id = ?',
            [name, phone, address, id],
            callback
        );
    }

    // Order methods
    createOrder(tableNumber, items, isDelivery = false, customerId = null, callback) {
        const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const db = this.db; // Store reference to db

        // Fallback for tableNumber if the DB has NOT NULL constraint (e.g. existing dbs)
        // We use 0 for delivery or unassigned tables
        const finalTableNumber = tableNumber || 0;

        const now = getCurrentTimestamp();
        db.run(
            'INSERT INTO orders (table_number, total, status, created_at, updated_at, is_delivery, customer_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [finalTableNumber, total, ORDER_STATUS.COOKING, now, now, isDelivery ? 1 : 0, customerId],
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
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN customers c ON o.customer_id = c.id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, callback);
    }

    getActiveOrders(callback) {
        this.db.all(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN customers c ON o.customer_id = c.id
      WHERE o.status != '${ORDER_STATUS.COMPLETED}'
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
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items,
        c.name as customer_name,
        c.phone as customer_phone,
        c.address as customer_address
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN customers c ON o.customer_id = c.id
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
        // Period-based reporting: 6am to 6am
        // For a given date like "2026-02-12", the period is from "2026-02-12 06:00:00" to "2026-02-13 05:59:59"

        const calculatePeriodBounds = (date) => {
            const periodStart = `${date} 06:00:00`;
            // Add one day for period end
            const d = new Date(date);
            d.setDate(d.getDate() + 1);
            const nextDay = d.toISOString().split('T')[0];
            const periodEnd = `${nextDay} 05:59:59`;
            return { periodStart, periodEnd };
        };

        // Calculate period boundaries
        const startPeriod = calculatePeriodBounds(startDate || '1970-01-01');
        const endPeriod = calculatePeriodBounds(endDate || new Date().toISOString().split('T')[0]);

        const start = startPeriod.periodStart;
        const end = endPeriod.periodEnd;

        const report = {
            summary: {},
            dailySales: [],
            topItems: []
        };

        // 1. Summary (Total, Count, Average) - Only 'COMPLETED' orders
        const sqlSummary = `
            SELECT 
                COUNT(*) as total_orders, 
                SUM(total) as total_revenue, 
                AVG(total) as average_ticket 
            FROM orders 
            WHERE status = '${ORDER_STATUS.COMPLETED}' 
            AND created_at BETWEEN ? AND ?
        `;

        this.db.get(sqlSummary, [start, end], (err, summaryRow) => {
            if (err) return callback(err);
            report.summary = summaryRow || { total_orders: 0, total_revenue: 0, average_ticket: 0 };

            // 2. Daily Sales by Period (6am-6am)
            // We need to group orders into periods manually since SQLite doesn't have easy period grouping
            const sqlDaily = `
                SELECT 
                    created_at,
                    total
                FROM orders 
                WHERE status = '${ORDER_STATUS.COMPLETED}' 
                AND created_at BETWEEN ? AND ? 
                ORDER BY created_at ASC
            `;

            this.db.all(sqlDaily, [start, end], (err, orderRows) => {
                if (err) return callback(err);

                // Group orders by period
                const periodMap = {};
                orderRows.forEach(order => {
                    const orderDate = new Date(order.created_at);
                    const hour = orderDate.getHours();

                    // Determine which period this order belongs to
                    let periodDate = new Date(orderDate);
                    if (hour < 6) {
                        // Before 6am, belongs to previous day's period
                        periodDate.setDate(periodDate.getDate() - 1);
                    }

                    const periodKey = periodDate.toISOString().split('T')[0];

                    if (!periodMap[periodKey]) {
                        periodMap[periodKey] = {
                            date: periodKey,
                            orders_count: 0,
                            daily_revenue: 0
                        };
                    }

                    periodMap[periodKey].orders_count++;
                    periodMap[periodKey].daily_revenue += order.total;
                });

                report.dailySales = Object.values(periodMap).sort((a, b) => a.date.localeCompare(b.date));

                // 3. Top Items Grouped by Category
                const sqlItems = `
                    SELECT 
                        COALESCE(m.category, 'Sin Categoría') as category,
                        oi.item_name, 
                        SUM(oi.quantity) as quantity_sold, 
                        SUM(oi.price * oi.quantity) as item_revenue 
                    FROM order_items oi
                    JOIN orders o ON oi.order_id = o.id
                    LEFT JOIN menu_items m ON TRIM(
                        CASE 
                            WHEN oi.item_name LIKE '% (%)' THEN 
                                SUBSTR(oi.item_name, 1, INSTR(oi.item_name, ' (') - 1)
                            ELSE oi.item_name
                        END
                    ) = TRIM(m.name) COLLATE NOCASE
                    WHERE o.status = '${ORDER_STATUS.COMPLETED}' 
                    AND o.created_at BETWEEN ? AND ?
                    GROUP BY m.category, oi.item_name
                    ORDER BY m.category ASC, quantity_sold DESC
                `;

                this.db.all(sqlItems, [start, end], (err, itemRows) => {
                    if (err) return callback(err);

                    // Group items by category
                    const categoryMap = {};
                    itemRows.forEach(item => {
                        const category = item.category;
                        if (!categoryMap[category]) {
                            categoryMap[category] = {
                                category: category,
                                items: []
                            };
                        }
                        categoryMap[category].items.push({
                            item_name: item.item_name,
                            quantity_sold: item.quantity_sold,
                            item_revenue: item.item_revenue
                        });
                    });

                    // Convert to array and sort categories by total revenue
                    report.topItems = Object.values(categoryMap).map(cat => {
                        const totalRevenue = cat.items.reduce((sum, item) => sum + item.item_revenue, 0);
                        return { ...cat, totalRevenue };
                    }).sort((a, b) => b.totalRevenue - a.totalRevenue);

                    callback(null, report);
                });
            });
        });
    }


    // Cleanup Methods
    clearAllMenuItems(callback) {
        this.db.run('DELETE FROM menu_items', callback);
    }

    // Get orders by specific date (YYYY-MM-DD)
    getOrdersByDate(date, callback) {
        const startOfDay = `${date} 00:00:00`;
        const endOfDay = `${date} 23:59:59`;

        this.db.all(`
            SELECT o.*, 
                GROUP_CONCAT(oi.item_name || ' x' || oi.quantity || ' [' || oi.price || ']') as items,
                c.name as customer_name,
                c.phone as customer_phone,
                c.address as customer_address
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN customers c ON o.customer_id = c.id
            WHERE o.created_at BETWEEN ? AND ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `, [startOfDay, endOfDay], callback);
    }

    // Delete an order and its items
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

    close() {
        this.db.close();
    }
}


module.exports = new Database();

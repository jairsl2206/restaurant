const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err.message);
            } else {
                console.log('Connected to SQLite database');
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
          available BOOLEAN DEFAULT 1
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
                            console.error(`Error creating user ${username}:`, err);
                        } else {
                            console.log(`Default user created: ${username} (${role})`);
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

        db.run(
            'INSERT INTO orders (table_number, total) VALUES (?, ?)',
            [tableNumber, total],
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
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, callback);
    }

    getActiveOrders(callback) {
        this.db.all(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity) as items
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.status != 'Pagado'
      GROUP BY o.id
      ORDER BY o.created_at DESC
    `, callback);
    }

    updateOrderStatus(orderId, status, callback) {
        this.db.run(
            'UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [status, orderId],
            callback
        );
    }

    getOrderById(orderId, callback) {
        this.db.get(`
      SELECT o.*, 
        GROUP_CONCAT(oi.item_name || ' x' || oi.quantity) as items
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

    createMenuItem(item, callback) {
        const { name, description, price, image_url, category, available } = item;
        this.db.run(
            'INSERT INTO menu_items (name, description, price, image_url, category, available) VALUES (?, ?, ?, ?, ?, ?)',
            [name, description, price, image_url, category, available ? 1 : 0],
            function (err) {
                callback(err, this ? this.lastID : null);
            }
        );
    }

    updateMenuItem(id, item, callback) {
        const { name, description, price, image_url, category, available } = item;
        this.db.run(
            'UPDATE menu_items SET name = ?, description = ?, price = ?, image_url = ?, category = ?, available = ? WHERE id = ?',
            [name, description, price, image_url, category, available ? 1 : 0, id],
            callback
        );
    }

    deleteMenuItem(id, callback) {
        this.db.run('DELETE FROM menu_items WHERE id = ?', [id], callback);
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
                SELECT GROUP_CONCAT(item_name || ' x' || quantity) as items, is_updated 
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

                        // 3. Update order total and flag
                        db.run(
                            'UPDATE orders SET total = ?, is_updated = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                            [total, orderId],
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

    close() {
        this.db.close();
    }
}

module.exports = new Database();

const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');

const router = express.Router();

// Login endpoint
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.getUserByUsername(username, (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    });
});

// Get all active orders
router.get('/orders', (req, res) => {
    db.getActiveOrders((err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(orders);
    });
});

// Get all orders (including completed)
router.get('/orders/all', (req, res) => {
    db.getOrders((err, orders) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(orders);
    });
});

// Create new order
router.post('/orders', (req, res) => {
    const { tableNumber, items } = req.body;

    if (!tableNumber || !items || items.length === 0) {
        return res.status(400).json({ error: 'Table number and items required' });
    }

    db.createOrder(tableNumber, items, (err, orderId) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to create order' });
        }

        db.getOrderById(orderId, (err, order) => {
            if (err) {
                return res.status(500).json({ error: 'Order created but failed to retrieve' });
            }
            res.status(201).json(order);
        });
    });
});

// Update order items (Edit Order)
router.put('/orders/:id', (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
    }

    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    db.updateOrderItems(id, items, total, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update order items' });

        // Return updated order
        db.getOrderById(id, (err, order) => {
            if (err) return res.status(500).json({ error: 'Updated but failed to retrieve' });
            res.json(order);
        });
    });
});

// Update order status
router.put('/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Creado', 'En Cocina', 'Listo para Servir', 'Servido', 'Pagado'];

    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // If status is "Listo para Servir", we clear the is_updated flag (Ack)
    if (status === 'Listo para Servir') {
        db.updateOrderStatus(id, status, (err) => {
            if (err) return res.status(500).json({ error: 'Failed' });
            // Also explicitly clear flag AND snapshot
            db.db.run('UPDATE orders SET is_updated = 0, original_items_snapshot = NULL WHERE id = ?', [id], () => {
                db.getOrderById(id, (err, order) => {
                    res.json(order);
                });
            });
        });
        return;
    }

    db.updateOrderStatus(id, status, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to update order' });
        }

        db.getOrderById(id, (err, order) => {
            if (err) {
                return res.status(500).json({ error: 'Order updated but failed to retrieve' });
            }
            res.json(order);
        });
    });
});

// --- Menu Routes ---

// Get all menu items
router.get('/menu', (req, res) => {
    db.getMenuItems((err, items) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(items);
    });
});

const isAdmin = (req, res, next) => {
    const role = req.headers['x-role'];
    if (role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// Admin: Create menu item
router.post('/menu', isAdmin, (req, res) => {
    const item = req.body;
    db.createMenuItem(item, (err, id) => {
        if (err) return res.status(500).json({ error: 'Failed to create item' });
        res.status(201).json({ id, ...item });
    });
});

// Admin: Update menu item
router.put('/menu/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    const item = req.body;
    db.updateMenuItem(id, item, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update item' });
        res.json({ success: true });
    });
});

// Admin: Delete menu item
router.delete('/menu/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.deleteMenuItem(id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete item' });
        res.json({ success: true });
    });
});

// --- User Routes (Admin only) ---

router.get('/users', isAdmin, (req, res) => {
    db.getUsers((err, users) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(users);
    });
});

router.post('/users', isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    db.createUser(username, password, role || 'waiter', (err) => {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        res.status(201).json({ success: true });
    });
});

router.delete('/users/:id', isAdmin, (req, res) => {
    const { id } = req.params;
    db.deleteUser(id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete user' });
        res.json({ success: true });
    });
});

router.put('/users/:id/role', isAdmin, (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    db.updateUserRole(id, role, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update role' });
        res.json({ success: true });
    });
});

// --- Settings Routes ---

router.get('/settings', (req, res) => {
    db.getSettings((err, settings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        // Return defaults if empty
        const defaults = {
            restaurant_name: 'Restaurant POS',
            restaurant_logo: '🍔'
        };
        res.json({ ...defaults, ...settings });
    });
});

router.put('/settings', isAdmin, (req, res) => {
    const { restaurant_name, restaurant_logo } = req.body;

    // Process updates linearly (simple)
    if (restaurant_name) {
        db.updateSetting('restaurant_name', restaurant_name, (err) => {
            if (err) console.error(err);
        });
    }

    if (restaurant_logo) {
        db.updateSetting('restaurant_logo', restaurant_logo, (err) => {
            if (err) console.error(err);
        });
    }

    // Give DB a moment (async naive implementation for SQLite)
    setTimeout(() => {
        res.json({ success: true });
    }, 100);
});

module.exports = router;

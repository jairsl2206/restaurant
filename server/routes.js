const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('./db');
const logger = require('./logger');

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

// Helper to send WhatsApp
const notifyWhatsApp = (req, message) => {
    if (!req.whatsapp) return;

    db.getSettings((err, settingsMap) => {
        if (err || !settingsMap) return;
        const phone = settingsMap['whatsapp_number'];
        if (phone) {
            req.whatsapp.sendMessage(phone, message);
        }
    });
};

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

            // Notify WhatsApp
            const maxLen = 25;
            const itemDetails = items.map(i => `- ${i.quantity}x ${i.name.length > maxLen ? i.name.substring(0, maxLen) + '...' : i.name}`).join('\n');
            const total = items.reduce((sum, i) => sum + (i.price * i.quantity), 0).toFixed(2);

            const msg = `🧾 *NUEVA ORDEN #${order.id}*\n🪑 Mesa: ${tableNumber}\n\n${itemDetails}\n\n💰 Total: $${total}\n🕒 ${new Date().toLocaleTimeString()}`;
            notifyWhatsApp(req, msg);

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

            // Notify WhatsApp of Update
            const maxLen = 25;
            const itemDetails = items.map(i => `- ${i.quantity}x ${i.name.length > maxLen ? i.name.substring(0, maxLen) + '...' : i.name}`).join('\n');
            const msg = `📝 *ORDEN ACTUALIZADA #${id}*\n🪑 Mesa: ${order.table_number}\n\n${itemDetails}\n\n💰 Nuevo Total: $${total.toFixed(2)}\n🕒 ${new Date().toLocaleTimeString()}`;
            notifyWhatsApp(req, msg);

            res.json(order);
        });
    });
});

// Update order status
router.put('/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['Creado', 'En Cocina', 'Listo para Servir', 'Servido', 'Pagado', 'Cancelado'];

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
                    if (!err && order) {
                        const msg = `🔔 *ORDEN LISTA # ${order.id}*\n🪑 Mesa: ${order.table_number}\n\nFavor de recoger en cocina.`;
                        notifyWhatsApp(req, msg);
                    }
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

            // --- WhatsApp Notification Logic ---
            if (status === 'Cancelado') {
                const msg = `❌ *Orden Cancelada*\nOrden #${order.id}\nMesa: ${order.table_number}\nTotal: $${order.total}`;
                notifyWhatsApp(req, msg);
            } else if (status === 'Pagado') {
                const msg = `✅ *Pago Recibido*\nOrden #${order.id}\nMesa: ${order.table_number}\nTotal: $${order.total}\nGracias por su compra!`;
                notifyWhatsApp(req, msg);
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
            restaurant_logo: '🍔',
            max_tables: 20
        };
        res.json({ ...defaults, ...settings });
    });
});

router.post('/settings', isAdmin, (req, res) => {
    const { restaurant_name, restaurant_logo, max_tables, whatsapp_number } = req.body;

    // Process updates linearly
    if (restaurant_name) {
        db.updateSetting('restaurant_name', restaurant_name, (err) => {
            if (err) logger.error('Error updating setting:', err);
        });
    }

    if (restaurant_logo) {
        db.updateSetting('restaurant_logo', restaurant_logo, (err) => {
            if (err) logger.error('Error updating setting:', err);
        });
    }

    if (max_tables !== undefined) {
        db.updateSetting('max_tables', max_tables.toString(), (err) => {
            if (err) logger.error('Error updating setting:', err);
        });
    }

    if (whatsapp_number !== undefined) {
        db.updateSetting('whatsapp_number', whatsapp_number, (err) => {
            if (err) logger.error('Error updating setting:', err);
        });
    }

    // Give DB a moment (async naive implementation for SQLite)
    setTimeout(() => {
        res.json({ success: true });
    }, 100);
});

// WhatsApp Status Route
router.get('/whatsapp/status', (req, res) => {
    if (!req.whatsapp) return res.json({ isReady: false });
    res.json(req.whatsapp.getStatus());
});

// WhatsApp Groups Route
router.get('/whatsapp/groups', async (req, res) => {
    logger.info('GET /whatsapp/groups endpoint hit');
    if (!req.whatsapp) return res.json([]);
    const groups = await req.whatsapp.getGroups();
    res.json(groups);
});

// WhatsApp Reset Route
router.post('/whatsapp/reset', isAdmin, async (req, res) => {
    if (!req.whatsapp) return res.status(500).json({ error: 'WhatsApp service not available' });
    await req.whatsapp.resetSession();
    res.json({ success: true, message: 'WhatsApp session reset initiated' });
});

// Sales Report Endpoint
router.get('/reports/sales', (req, res) => {
    const { startDate, endDate } = req.query;
    db.getSalesReport(startDate, endDate, (err, report) => {
        if (err) {
            console.error('Report error:', err);
            return res.status(500).json({ error: 'Failed to generate report' });
        }
        res.json(report);
    });
});

// --- Cleanup Routes (Admin only) ---

router.delete('/menu/all', isAdmin, (req, res) => {
    db.clearAllMenuItems((err) => {
        if (err) return res.status(500).json({ error: 'Failed to clear menu' });
        res.json({ success: true, message: 'Menu cleared successfully' });
    });
});

router.delete('/orders/all', isAdmin, (req, res) => {
    db.clearAllOrders((err) => {
        if (err) return res.status(500).json({ error: 'Failed to clear orders' });
        res.json({ success: true, message: 'All orders cleared successfully' });
    });
});

module.exports = router;

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const logger = require('./logger');
const { ORDER_STATUS, ORDER_TYPE, USER_ROLE, PAYMENT_METHOD } = require('./constants');

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-pos-secret-key-change-in-production';
const JWT_EXPIRES_IN = '6h';

// ── AUTH ─────────────────────────────────────────────────────────────────────

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.getUserByUsername(username, (err, user) => {
        if (err)   return res.status(500).json({ error: 'Database error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const isValid = bcrypt.compareSync(password, user.password_hash);
        if (!isValid) return res.status(401).json({ error: 'Invalid credentials' });

        const userData = { id: user.id, username: user.username, role: user.role };
        const token = jwt.sign(userData, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

        res.json({ success: true, user: userData, token });
    });
});

router.get('/verify-session', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user: { id: decoded.id, username: decoded.username, role: decoded.role } });
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
});

// ── MIDDLEWARE ───────────────────────────────────────────────────────────────

const isAdmin = (req, res, next) => {
    const role = req.headers['x-role'];
    if (role !== USER_ROLE.ADMIN && role !== USER_ROLE.MANAGER) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

// ── WHATSAPP HELPER ──────────────────────────────────────────────────────────

const notifyWhatsApp = (req, message) => {
    if (!req.whatsapp) return;
    db.getSettings((err, settingsMap) => {
        if (err || !settingsMap) return;
        const phone = settingsMap['whatsapp_number'];
        if (phone) req.whatsapp.sendMessage(phone, message);
    });
};

// ── ORDERS ────────────────────────────────────────────────────────────────────

// GET /api/orders — active orders
router.get('/orders', (req, res) => {
    db.getActiveOrders((err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/all — all orders
router.get('/orders/all', (req, res) => {
    db.getOrders((err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/by-date?date=YYYY-MM-DD
router.get('/orders/by-date', (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });

    db.getOrdersByDate(date, (err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/:id
router.get('/orders/:id', (req, res) => {
    db.getOrderById(req.params.id, (err, order) => {
        if (err)    return res.status(500).json({ error: 'Database error' });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(_mapOrder(order));
    });
});

// POST /api/orders — create order
router.post('/orders', (req, res) => {
    const { tableNumber, items, type, customerData, notes } = req.body;
    const orderType = type || ORDER_TYPE.DINE_IN;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
    }

    // Validation per type
    if (orderType === ORDER_TYPE.DELIVERY || orderType === ORDER_TYPE.PICKUP) {
        if (!customerData || !customerData.name) {
            return res.status(400).json({ error: 'Customer name required for delivery/pickup orders' });
        }
    } else {
        if (!tableNumber) {
            return res.status(400).json({ error: 'Table number required for dine-in orders' });
        }
    }

    const doCreate = (customerId) => {
        db.createOrder(tableNumber || null, items, orderType, customerId, (err, orderId) => {
            if (err) {
                logger.error('Error creating order:', err);
                return res.status(500).json({ error: 'Failed to create order' });
            }

            db.getOrderById(orderId, (err, order) => {
                if (err) return res.status(500).json({ error: 'Order created but failed to retrieve' });

                // WhatsApp notification
                const maxLen = 25;
                const itemList = items.map(i =>
                    `- ${i.quantity}x ${i.name.length > maxLen ? i.name.substring(0, maxLen) + '...' : i.name}`
                ).join('\n');
                const total = items.reduce((s, i) => s + i.price * i.quantity, 0).toFixed(2);
                let header = '';
                if (orderType === ORDER_TYPE.DELIVERY) {
                    header = `🚗 Delivery\n👤 ${customerData.name}\n📞 ${customerData.phone || 'N/A'}\n📍 ${customerData.address || 'N/A'}\n`;
                } else if (orderType === ORDER_TYPE.PICKUP) {
                    header = `🛍️ Pickup\n👤 ${customerData.name}\n📞 ${customerData.phone || 'N/A'}\n`;
                } else {
                    header = `🪑 Mesa: ${tableNumber}\n`;
                }
                notifyWhatsApp(req, `🧾 *NUEVA ORDEN #${order.id}*\n${header}\n${itemList}\n\n💰 Total: $${total}\n🕒 ${new Date().toLocaleTimeString()}`);

                res.status(201).json(_mapOrder(order));
            });
        });
    };

    // Customer handling
    if ((orderType === ORDER_TYPE.DELIVERY || orderType === ORDER_TYPE.PICKUP) && customerData) {
        const phone = customerData.phone ? customerData.phone.trim() : '';
        const isPlaceholder = !phone || ['0', '00', '000'].includes(phone);

        if (isPlaceholder) {
            db.createCustomer(customerData.name, 'N/A', customerData.address || '', (err, cid) => {
                if (err) return res.status(500).json({ error: 'Failed to create customer' });
                doCreate(cid);
            });
        } else {
            db.getCustomerByPhone(phone, (err, existing) => {
                if (err) return res.status(500).json({ error: 'Database error' });

                if (existing) {
                    db.updateCustomer(existing.id, customerData.name, phone, customerData.address || '', (err) => {
                        if (err) logger.error('Error updating customer:', err);
                        doCreate(existing.id);
                    });
                } else {
                    db.createCustomer(customerData.name, phone, customerData.address || '', (err, cid) => {
                        if (err) return res.status(500).json({ error: 'Failed to create customer' });
                        doCreate(cid);
                    });
                }
            });
        }
    } else {
        doCreate(null);
    }
});

// PUT /api/orders/:id — update items
router.put('/orders/:id', (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    db.updateOrderItems(id, items, total, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update order items' });

        db.getOrderById(id, (err, order) => {
            if (err) return res.status(500).json({ error: 'Updated but failed to retrieve' });

            const maxLen = 25;
            const itemList = items.map(i =>
                `- ${i.quantity}x ${i.name.length > maxLen ? i.name.substring(0, maxLen) + '...' : i.name}`
            ).join('\n');
            notifyWhatsApp(req, `📝 *ORDEN ACTUALIZADA #${id}*\n🪑 Mesa: ${order.table_number || 'N/A'}\n\n${itemList}\n\n💰 Nuevo Total: $${total.toFixed(2)}\n🕒 ${new Date().toLocaleTimeString()}`);

            res.json(_mapOrder(order));
        });
    });
});

// PUT /api/orders/:id/status
router.put('/orders/:id/status', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
    }

    db.updateOrderStatus(id, status, null, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update order status' });

        db.getOrderById(id, (err, order) => {
            if (err) return res.status(500).json({ error: 'Updated but failed to retrieve' });

            // WhatsApp notifications by new status
            if (status === ORDER_STATUS.CANCELADA) {
                notifyWhatsApp(req, `❌ *Orden Cancelada*\nOrden #${order.id}\n${order.type === ORDER_TYPE.DELIVERY ? `🚗 ${order.customer_name}` : `🪑 Mesa: ${order.table_number}`}\nTotal: $${order.total}`);
            } else if (status === ORDER_STATUS.ENTREGADA) {
                notifyWhatsApp(req, `✅ *Pago Recibido*\nOrden #${order.id}\n${order.type === ORDER_TYPE.DELIVERY ? `🚗 ${order.customer_name}` : `🪑 Mesa: ${order.table_number}`}\nTotal: $${order.total}\nGracias por su compra!`);
            } else if (status === ORDER_STATUS.LISTA && order.type === ORDER_TYPE.DELIVERY) {
                notifyWhatsApp(req, `🔔 *ORDEN LISTA #${order.id}*\n🚗 Delivery — ${order.customer_name}\n📍 ${order.customer_address || 'Dirección registrada'}`);
            }

            res.json(_mapOrder(order));
        });
    });
});

// DELETE /api/orders/:id
router.delete('/orders/:id', (req, res) => {
    db.deleteOrder(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete order' });
        res.json({ success: true, message: 'Order deleted successfully' });
    });
});

// Delete all orders (admin)
router.delete('/orders/all', isAdmin, (req, res) => {
    db.clearAllOrders((err) => {
        if (err) return res.status(500).json({ error: 'Failed to clear orders' });
        res.json({ success: true, message: 'All orders cleared successfully' });
    });
});

// ── MENU CATEGORIES ───────────────────────────────────────────────────────────

router.get('/categories', (req, res) => {
    db.getMenuCategories((err, cats) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(cats);
    });
});

router.post('/categories', isAdmin, (req, res) => {
    db.createMenuCategory(req.body, (err, id) => {
        if (err) return res.status(500).json({ error: 'Failed to create category' });
        res.status(201).json({ id, ...req.body });
    });
});

router.put('/categories/:id', isAdmin, (req, res) => {
    db.updateMenuCategory(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update category' });
        res.json({ success: true });
    });
});

router.delete('/categories/:id', isAdmin, (req, res) => {
    db.deleteMenuCategory(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete category' });
        res.json({ success: true });
    });
});

// ── MENU ITEMS ────────────────────────────────────────────────────────────────

router.get('/menu', (req, res) => {
    const { type } = req.query;
    db.getMenuItemsWithPromotions((err, items) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const list = type === 'public' ? items.filter(i => i.available) : items;
        res.json(list);
    });
});

router.post('/menu', isAdmin, (req, res) => {
    db.createMenuItem(req.body, (err, id) => {
        if (err) return res.status(500).json({ error: 'Failed to create item' });
        res.status(201).json({ id, ...req.body });
    });
});

router.put('/menu/:id', isAdmin, (req, res) => {
    db.updateMenuItem(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update item' });
        res.json({ success: true });
    });
});

router.delete('/menu/:id', isAdmin, (req, res) => {
    db.deleteMenuItem(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete item' });
        res.json({ success: true });
    });
});

router.delete('/menu/all', isAdmin, (req, res) => {
    db.clearAllMenuItems((err) => {
        if (err) return res.status(500).json({ error: 'Failed to clear menu' });
        res.json({ success: true, message: 'Menu cleared successfully' });
    });
});

// ── CATEGORY PROMOTIONS ───────────────────────────────────────────────────────

router.get('/category-promotions', isAdmin, (req, res) => {
    db.getCategoryPromotions((err, promos) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(promos);
    });
});

router.post('/category-promotions', isAdmin, (req, res) => {
    db.createCategoryPromotion(req.body, (err, id) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ id, message: 'Category promotion created successfully' });
    });
});

router.put('/category-promotions/:id', isAdmin, (req, res) => {
    db.updateCategoryPromotion(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Category promotion updated successfully' });
    });
});

router.delete('/category-promotions/:id', isAdmin, (req, res) => {
    db.deleteCategoryPromotion(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Category promotion deleted successfully' });
    });
});

// ── ITEM PROMOTIONS ───────────────────────────────────────────────────────────

router.get('/item-promotions', isAdmin, (req, res) => {
    db.getItemPromotions((err, promos) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(promos);
    });
});

router.post('/item-promotions', isAdmin, (req, res) => {
    db.createItemPromotion(req.body, (err, id) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ id, message: 'Item promotion created successfully' });
    });
});

router.put('/item-promotions/:id', isAdmin, (req, res) => {
    db.updateItemPromotion(req.params.id, req.body, (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Item promotion updated successfully' });
    });
});

router.delete('/item-promotions/:id', isAdmin, (req, res) => {
    db.deleteItemPromotion(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ message: 'Item promotion deleted successfully' });
    });
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────────

router.get('/orders/:id/payments', (req, res) => {
    db.getPaymentsByOrder(req.params.id, (err, payments) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(payments);
    });
});

router.post('/orders/:id/payments', (req, res) => {
    const { method, amount, transaction_reference } = req.body;
    if (!method || !amount) return res.status(400).json({ error: 'method and amount required' });
    db.createPayment(
        { order_id: req.params.id, method, amount, transaction_reference },
        (err, id) => {
            if (err) return res.status(500).json({ error: 'Failed to create payment' });
            res.status(201).json({ id, success: true });
        }
    );
});

// ── USERS ─────────────────────────────────────────────────────────────────────

router.get('/users', isAdmin, (req, res) => {
    db.getUsers((err, users) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(users);
    });
});

router.post('/users', isAdmin, (req, res) => {
    const { username, password, role } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing fields' });

    const validRole = Object.values(USER_ROLE).includes(role) ? role : USER_ROLE.WAITER;
    db.createUser(username, password, validRole, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to create user' });
        res.status(201).json({ success: true });
    });
});

router.delete('/users/:id', isAdmin, (req, res) => {
    db.deleteUser(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete user' });
        res.json({ success: true });
    });
});

router.put('/users/:id/role', isAdmin, (req, res) => {
    const { role } = req.body;
    if (!Object.values(USER_ROLE).includes(role)) {
        return res.status(400).json({ error: `Invalid role. Valid: ${Object.values(USER_ROLE).join(', ')}` });
    }
    db.updateUserRole(req.params.id, role, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to update role' });
        res.json({ success: true });
    });
});

// ── SETTINGS ─────────────────────────────────────────────────────────────────

router.get('/settings', (req, res) => {
    db.getSettings((err, settings) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        const defaults = { restaurant_name: 'Restaurant POS', restaurant_logo: '🍔', max_tables: 20 };
        res.json({ ...defaults, ...settings });
    });
});

router.post('/settings', isAdmin, (req, res) => {
    const { restaurant_name, restaurant_logo, max_tables, whatsapp_number } = req.body;
    const updates = [];
    if (restaurant_name)             updates.push(['restaurant_name', restaurant_name]);
    if (restaurant_logo)             updates.push(['restaurant_logo', restaurant_logo]);
    if (max_tables !== undefined)    updates.push(['max_tables', max_tables.toString()]);
    if (whatsapp_number !== undefined) updates.push(['whatsapp_number', whatsapp_number]);

    updates.forEach(([k, v]) => db.updateSetting(k, v, (err) => {
        if (err) logger.error(`Error updating setting ${k}:`, err);
    }));

    setTimeout(() => res.json({ success: true }), 100);
});

// ── REPORTS ───────────────────────────────────────────────────────────────────

router.get('/reports/sales', (req, res) => {
    const { startDate, endDate } = req.query;
    db.getSalesReport(startDate, endDate, (err, report) => {
        if (err) {
            logger.error('Report error:', err);
            return res.status(500).json({ error: 'Failed to generate report' });
        }
        res.json(report);
    });
});

// ── ORDER STATUS HISTORY ──────────────────────────────────────────────────────

router.get('/orders/:id/history', (req, res) => {
    db.getOrderStatusHistory(req.params.id, (err, history) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(history);
    });
});

// ── WHATSAPP ────────────────────────────────────────────────────────────────

router.get('/whatsapp/status', (req, res) => {
    if (!req.whatsapp) return res.json({ isReady: false });
    res.json(req.whatsapp.getStatus());
});

router.get('/whatsapp/groups', async (req, res) => {
    logger.info('GET /whatsapp/groups endpoint hit');
    if (!req.whatsapp) return res.json([]);
    const groups = await req.whatsapp.getGroups();
    res.json(groups);
});

router.post('/whatsapp/reset', isAdmin, async (req, res) => {
    if (!req.whatsapp) return res.status(500).json({ error: 'WhatsApp service not available' });
    await req.whatsapp.resetSession();
    res.json({ success: true, message: 'WhatsApp session reset initiated' });
});

// ── HELPERS ──────────────────────────────────────────────────────────────────

/**
 * Normalise a DB row to a consistent shape for the frontend.
 * Keeps backward-compat fields (is_delivery, is_pickup) alongside new `type`.
 */
function _mapOrder(o) {
    if (!o) return null;
    return {
        ...o,
        // Derived compat fields so old frontend components still work
        is_delivery: o.type === ORDER_TYPE.DELIVERY ? 1 : 0,
        is_pickup:   o.type === ORDER_TYPE.PICKUP   ? 1 : 0
    };
}

function _mapOrders(orders) {
    return (orders || []).map(_mapOrder);
}

module.exports = router;

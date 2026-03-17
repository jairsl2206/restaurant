const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const logger = require('./logger');
const { ORDER_STATUS, ORDER_TYPE, USER_ROLE, PAYMENT_METHOD } = require('./constants');
const requireActivePeriod = require('./middleware/requireActivePeriod')(db);

const router = express.Router();

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    logger.error('FATAL: JWT_SECRET environment variable is not set. Server cannot start securely.');
    process.exit(1);
}
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

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Authentication required' });
    try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const isAdmin = (req, res, next) => {
    verifyToken(req, res, () => {
        if (req.user.role !== USER_ROLE.ADMIN && req.user.role !== USER_ROLE.MANAGER) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        next();
    });
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
router.get('/orders', verifyToken, (req, res) => {
    db.getActiveOrders((err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/all — all orders
router.get('/orders/all', verifyToken, (req, res) => {
    db.getOrders((err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/by-date?date=YYYY-MM-DD
router.get('/orders/by-date', verifyToken, (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'Date parameter required (YYYY-MM-DD)' });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    db.getOrdersByDate(date, (err, orders) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(_mapOrders(orders));
    });
});

// GET /api/orders/:id
router.get('/orders/:id', verifyToken, (req, res) => {
    db.getOrderById(req.params.id, (err, order) => {
        if (err)    return res.status(500).json({ error: 'Database error' });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(_mapOrder(order));
    });
});

// POST /api/orders — create order
router.post('/orders', verifyToken, requireActivePeriod, (req, res) => {
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
        db.createOrder(tableNumber || null, items, orderType, customerId, req.user.id, (err, orderId) => {
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
        const rawPhone = customerData.phone ? customerData.phone.trim() : '';
        const name     = customerData.name  ? customerData.name.trim()  : '';
        const email    = customerData.email ? customerData.email.trim()  : null;
        const address  = customerData.address ? customerData.address.trim() : null;

        // Returns true when the phone value carries no real information
        const isPlaceholderPhone = (p) => !p || p === '0' || p === '00' || p === '000';
        const hasRealPhone = !isPlaceholderPhone(rawPhone);
        const phone = hasRealPhone ? rawPhone : '';

        if (!hasRealPhone && !name) {
            // No usable identity — attach order without a customer record
            doCreate(null);
        } else if (!hasRealPhone) {
            // Has name but no real phone — deduplicate by name among phoneless customers
            db.findCustomerByNameOnly(name, (err, existing) => {
                if (err) {
                    console.error('Error looking up customer by name:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (existing) {
                    db.updateCustomer(existing.id, name, '', email, address, (err) => {
                        if (err) console.error('Error updating phoneless customer:', err);
                        doCreate(existing.id);
                    });
                } else {
                    db.createCustomer(name, '', email, address, (err, cid) => {
                        if (err) return res.status(500).json({ error: 'Failed to create customer' });
                        doCreate(cid);
                    });
                }
            });
        } else {
            // Real phone — look up by phone and upsert all fields
            db.getCustomerByPhone(phone, (err, existing) => {
                if (err) {
                    console.error('Error looking up customer by phone:', err);
                    return res.status(500).json({ error: 'Database error' });
                }
                if (existing) {
                    db.updateCustomer(existing.id, name, phone, email, address, (err) => {
                        if (err) console.error('Error updating customer:', err);
                        doCreate(existing.id);
                    });
                } else {
                    db.createCustomer(name, phone, email, address, (err, cid) => {
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
router.put('/orders/:id', verifyToken, (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
    }

    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

    // Capture items before update to compute diff
    db.getOrderById(id, (err, orderBefore) => {
        if (err) return res.status(500).json({ error: 'Failed to retrieve order before update' });

        // beforeMap: key=name.toLowerCase(), value={ qty, originalName, price }
        const beforeMap = {};
        if (orderBefore && orderBefore.items) {
            orderBefore.items.split(/,\s*(?![^(]*\))/).forEach(part => {
                let content = part.trim();
                let price = 0;
                const priceMatch = content.match(/(.+) \[(\d+\.?\d*)\]$/);
                if (priceMatch) { content = priceMatch[1].trim(); price = parseFloat(priceMatch[2]); }
                const qtyMatch = content.match(/(.+) x(\d+)$/);
                const name = qtyMatch ? qtyMatch[1].trim() : content;
                const qty  = qtyMatch ? parseInt(qtyMatch[2], 10) : 1;
                const k = name.toLowerCase();
                if (!beforeMap[k]) beforeMap[k] = { qty: 0, name, price };
                beforeMap[k].qty += qty;
            });
        }

        // afterMap: key=name.toLowerCase(), value={ qty }
        const afterMap = {};
        items.forEach(i => {
            const k = i.name.trim().toLowerCase();
            if (!afterMap[k]) afterMap[k] = { qty: 0 };
            afterMap[k].qty += i.quantity;
        });

        // Quantity-aware diff: tracks unit additions/removals, not just name presence
        const diff = [];
        const allKeys = new Set([...Object.keys(beforeMap), ...Object.keys(afterMap)]);
        for (const key of allKeys) {
            const before    = beforeMap[key] || { qty: 0, name: key, price: 0 };
            const after     = afterMap[key]  || { qty: 0 };
            const afterItem = items.find(i => i.name.trim().toLowerCase() === key);

            const keptQty    = Math.min(before.qty, after.qty);
            const addedQty   = Math.max(0, after.qty - before.qty);
            const removedQty = Math.max(0, before.qty - after.qty);

            if (keptQty  > 0 && afterItem)
                diff.push({ ...afterItem, quantity: keptQty,    diffStatus: 'kept'    });
            if (addedQty > 0 && afterItem)
                diff.push({ ...afterItem, quantity: addedQty,   diffStatus: 'added'   });
            if (removedQty > 0)
                diff.push({ name: before.name, quantity: removedQty, price: before.price, diffStatus: 'removed' });
        }

        db.updateOrderItems(id, items, total, diff, (err) => {
            if (err) return res.status(500).json({ error: 'Failed to update order items' });

            db.getOrderById(id, (err, order) => {
                if (err) return res.status(500).json({ error: 'Updated but failed to retrieve' });

                const maxLen = 25;
                const trunc = (n) => n.length > maxLen ? n.substring(0, maxLen) + '...' : n;
                const locationInfo = order.type === 'DELIVERY'
                    ? `🚗 Delivery: ${order.customer_name || 'N/A'}`
                    : order.type === 'PICKUP'
                        ? `🛍️ Pickup: ${order.customer_name || 'N/A'}`
                        : `🪑 Mesa: ${order.table_number || 'N/A'}`;

                const addedForWA   = diff.filter(d => d.diffStatus === 'added');
                const removedForWA = diff.filter(d => d.diffStatus === 'removed');
                const diffLines = [
                    ...addedForWA.map(i   => `  ✅ ${trunc(i.name)} x${i.quantity} (AGREGADO)`),
                    ...removedForWA.map(i => `  ❌ ${trunc(i.name)} x${i.quantity} (CANCELADO)`),
                ].join('\n');

                notifyWhatsApp(req, `📝 *ORDEN ACTUALIZADA #${id}*\n${locationInfo}\n\n${diffLines}\n\n💰 Nuevo Total: $${total.toFixed(2)}\n🕒 ${new Date().toLocaleTimeString()}`);

                res.json({ order: _mapOrder(order), diff });
            });
        });
    });
});

// POST /api/orders/:id/additions — add items to an existing active order (creates sub-order)
router.post('/orders/:id/additions', verifyToken, requireActivePeriod, (req, res) => {
    const { id } = req.params;
    const { items } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ error: 'Items required' });
    }

    db.createSubOrder(id, items, (err, subOrderId) => {
        if (err) return res.status(500).json({ error: err.message || 'Failed to create addition' });

        db.getOrderById(subOrderId, (err2, order) => {
            if (err2) return res.status(500).json({ error: 'Created but failed to retrieve' });
            res.status(201).json(_mapOrder(order));
        });
    });
});

// PUT /api/orders/:id/status
router.put('/orders/:id/status', verifyToken, (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = Object.values(ORDER_STATUS);
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: `Invalid status. Valid values: ${validStatuses.join(', ')}` });
    }

    db.updateOrderStatus(id, status, req.user.id, (err) => {
        if (err) {
            if (err.code === 'PENDING_ADDITIONS') return res.status(409).json({ error: err.message });
            return res.status(500).json({ error: 'Failed to update order status' });
        }

        db.getOrderById(id, (err, order) => {
            if (err) return res.status(500).json({ error: 'Updated but failed to retrieve' });

            // WhatsApp notifications by new status
            if (status === ORDER_STATUS.FINALIZADO) {
                db.finalizeSubOrders(id, (err) => {
                    if (err) logger.error('Error finalizing sub-orders:', err);
                });
                notifyWhatsApp(req, `✅ *Pago Recibido*\nOrden #${order.id}\n${order.type === ORDER_TYPE.DELIVERY ? `🚗 ${order.customer_name}` : `🪑 Mesa: ${order.table_number}`}\nTotal: $${order.total}\n¡Gracias por su compra!`);
            } else if (status === ORDER_STATUS.EN_REPARTO) {
                notifyWhatsApp(req, `🚗 *ORDEN EN CAMINO #${order.id}*\n🚗 Delivery — ${order.customer_name}\n📍 ${order.customer_address || 'Dirección registrada'}`);
            } else if (status === ORDER_STATUS.LISTO_PARA_RECOGER) {
                notifyWhatsApp(req, `🔔 *ORDEN LISTA PARA RECOGER #${order.id}*\n📦 ${order.customer_name} — su pedido está listo para recoger.`);
            }

            res.json(_mapOrder(order));
        });
    });
});

// DELETE /orders/all must be declared before DELETE /orders/:id to avoid shadowing
router.delete('/orders/all', isAdmin, (req, res) => {
    db.clearAllOrders((err) => {
        if (err) return res.status(500).json({ error: 'Failed to clear orders' });
        res.json({ success: true, message: 'All orders cleared successfully' });
    });
});

// DELETE /api/orders/:id
router.delete('/orders/:id', verifyToken, (req, res) => {
    db.deleteOrder(req.params.id, (err) => {
        if (err) return res.status(500).json({ error: 'Failed to delete order' });
        res.json({ success: true, message: 'Order deleted successfully' });
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
    const { type, buy_quantity, pay_quantity } = req.body;
    if (type === 'BUNDLE') {
        const bq = parseInt(buy_quantity, 10);
        const pq = parseInt(pay_quantity, 10);
        if (!bq || !pq || isNaN(bq) || isNaN(pq) || pq <= 0 || bq <= pq) {
            return res.status(400).json({ error: 'BUNDLE requiere buy_quantity > pay_quantity > 0' });
        }
    }
    db.createCategoryPromotion(req.body, (err, id) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.status(201).json({ id, message: 'Category promotion created successfully' });
    });
});

router.put('/category-promotions/:id', isAdmin, (req, res) => {
    const { type, buy_quantity, pay_quantity } = req.body;
    if (type === 'BUNDLE') {
        const bq = parseInt(buy_quantity, 10);
        const pq = parseInt(pay_quantity, 10);
        if (!bq || !pq || isNaN(bq) || isNaN(pq) || pq <= 0 || bq <= pq) {
            return res.status(400).json({ error: 'BUNDLE requiere buy_quantity > pay_quantity > 0' });
        }
    }
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

router.get('/orders/:id/payments', verifyToken, (req, res) => {
    db.getPaymentsByOrder(req.params.id, (err, payments) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(payments);
    });
});

router.post('/orders/:id/payments', verifyToken, (req, res) => {
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
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });

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

router.post('/settings', isAdmin, async (req, res) => {
    const { restaurant_name, restaurant_logo, max_tables, whatsapp_number } = req.body;
    const updates = [];
    if (restaurant_name)               updates.push(['restaurant_name', restaurant_name]);
    if (restaurant_logo)               updates.push(['restaurant_logo', restaurant_logo]);
    if (max_tables !== undefined)      updates.push(['max_tables', max_tables.toString()]);
    if (whatsapp_number !== undefined) updates.push(['whatsapp_number', whatsapp_number]);

    try {
        await Promise.all(updates.map(([k, v]) => new Promise((resolve, reject) => {
            db.updateSetting(k, v, (err) => err ? reject(err) : resolve());
        })));
        res.json({ success: true });
    } catch (err) {
        logger.error('Error updating settings:', err);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// ── SALE PERIODS ──────────────────────────────────────────────────────────────

// GET /api/sale-periods/active — periodo actualmente abierto (o null)
router.get('/sale-periods/active', verifyToken, (req, res) => {
    db.getActiveSalePeriod((err, period) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(period || null);
    });
});

// GET /api/sale-periods — historial de todos los periodos
router.get('/sale-periods', verifyToken, (req, res) => {
    db.getSalePeriods((err, periods) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(periods || []);
    });
});

// POST /api/sale-periods — abrir nueva jornada (solo admin/manager)
router.post('/sale-periods', isAdmin, (req, res) => {
    db.openSalePeriod(req.user.id, (err, periodId) => {
        if (err) {
            if (err.message === 'Ya existe una jornada abierta') {
                return res.status(409).json({ error: err.message });
            }
            return res.status(500).json({ error: 'Failed to open period' });
        }
        db.getActiveSalePeriod((err2, period) => {
            if (err2) return res.status(500).json({ error: 'Period opened but failed to retrieve' });
            res.status(201).json(period);
        });
    });
});

// PUT /api/sale-periods/:id/close — cerrar jornada (solo admin/manager)
// Body: { force: true } para forzar cierre con órdenes activas
router.put('/sale-periods/:id/close', isAdmin, (req, res) => {
    const { id } = req.params;
    const force = req.body && req.body.force === true;

    db.closeSalePeriod(id, req.user.id, force, (err, result) => {
        if (err) return res.status(500).json({ error: 'Failed to close period' });
        if (result.warning) {
            return res.status(409).json({
                warning: true,
                activeOrdersCount: result.activeOrdersCount,
                activeOrders: result.activeOrders,
                message: `Hay ${result.activeOrdersCount} orden(es) activa(s). Avisa a los operadores que cierren sus órdenes pendientes antes de forzar el cierre.`
            });
        }
        res.json({ success: true });
    });
});

// GET /api/sale-periods/:id/report — reporte de ventas por jornada
router.get('/sale-periods/:id/report', verifyToken, (req, res) => {
    db.getSalePeriodReport(req.params.id, (err, report) => {
        if (err) {
            if (err.message === 'Period not found') return res.status(404).json({ error: 'Period not found' });
            return res.status(500).json({ error: 'Failed to generate report' });
        }
        res.json(report);
    });
});

// ── REPORTS ───────────────────────────────────────────────────────────────────

router.get('/reports/sales', verifyToken, (req, res) => {
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

router.get('/orders/:id/history', verifyToken, (req, res) => {
    db.getOrderStatusHistory(req.params.id, (err, history) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(history);
    });
});

// ── WHATSAPP ────────────────────────────────────────────────────────────────

router.get('/whatsapp/status', verifyToken, (req, res) => {
    if (!req.whatsapp) return res.json({ isReady: false });
    res.json(req.whatsapp.getStatus());
});

router.get('/whatsapp/groups', verifyToken, async (req, res) => {
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
    const _parseJson = (str) => { try { return JSON.parse(str); } catch { return null; } };
    return {
        ...o,
        diff:         o.diff_json            ? _parseJson(o.diff_json)            : null,
        lastEditDiff: o.last_edit_diff_json  ? _parseJson(o.last_edit_diff_json)  : null,
        is_delivery: o.type === ORDER_TYPE.DELIVERY ? 1 : 0,
        is_pickup:   o.type === ORDER_TYPE.PICKUP   ? 1 : 0
    };
}

function _mapOrders(orders) {
    return (orders || []).map(_mapOrder);
}

module.exports = router;

const IOrderRepository = require('../../../domain/repositories/IOrderRepository');
const Order = require('../../../domain/entities/Order');
const OrderItem = require('../../../domain/entities/OrderItem');
const OrderStatus = require('../../../domain/value-objects/OrderStatus');
const { DatabaseError, NotFoundError } = require('../../../shared/errors/errorTypes');

/**
 * OrderRepository Implementation
 * Implements IOrderRepository using SQLite (new schema)
 */
class OrderRepository extends IOrderRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    // ── Mappers ─────────────────────────────────────────────────────────────────

    _rowToOrder(row, items = []) {
        return new Order({
            id:           row.id,
            branchId:     row.branch_id,
            customerId:   row.customer_id  || null,
            waiterId:     row.waiter_id    || null,
            tableNumber:  row.table_number || null,
            type:         row.type         || 'DINE_IN',
            status:       row.status,
            items,
            discountTotal: row.discount_total || 0,
            taxTotal:     row.tax_total       || 0,
            notes:        row.notes           || null,
            createdAt:    new Date(row.created_at),
            updatedAt:    new Date(row.updated_at)
        });
    }

    _rowsToOrderItems(rows) {
        return rows.map(row => new OrderItem({
            id:             row.id,
            orderId:        row.order_id,
            menuItemId:     row.menu_item_id || null,
            itemName:       row.item_name    || row.name || 'item',
            quantity:       row.quantity,
            unitPrice:      row.unit_price   || row.price || 0,
            discountAmount: row.discount_amount || 0
        }));
    }

    // ── Private helpers ──────────────────────────────────────────────────────────

    _fetchItems(orderId) {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT oi.*, COALESCE(mi.name, 'item') AS item_name
                 FROM order_items oi
                 LEFT JOIN menu_items mi ON mi.id = oi.menu_item_id
                 WHERE oi.order_id = ?`,
                [orderId],
                (err, rows) => {
                    if (err) return reject(new DatabaseError(`Failed to fetch items: ${err.message}`));
                    resolve(this._rowsToOrderItems(rows || []));
                }
            );
        });
    }

    _fetchOrderRow(id) {
        return new Promise((resolve, reject) => {
            this.db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
                if (err) return reject(new DatabaseError(`Failed to find order: ${err.message}`));
                resolve(row || null);
            });
        });
    }

    // ── Interface implementation ─────────────────────────────────────────────────

    async save(order) {
        const DEFAULT_BRANCH_ID = 1;
        const branchId = order.branchId || DEFAULT_BRANCH_ID;
        const self = this;

        return new Promise((resolve, reject) => {
            self.db.run(
                `INSERT INTO orders
                    (branch_id, customer_id, waiter_id, table_number, type, status,
                     subtotal, discount_total, tax_total, total, notes, created_at, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now','localtime'), datetime('now','localtime'))`,
                [
                    branchId,
                    order.customerId || null,
                    order.waiterId   || null,
                    order.tableNumber || null,
                    order.type       || 'DINE_IN',
                    order.status.value,
                    order.subtotal.amount,
                    order.discountTotal || 0,
                    order.taxTotal     || 0,
                    order.total.amount,
                    order.notes || null
                ],
                async function (err) {
                    if (err) return reject(new DatabaseError(`Failed to save order: ${err.message}`));
                    const orderId = this.lastID; // SQLite statement context

                    try {
                        // Insert items
                        await new Promise((res, rej) => {
                            const stmt = self.db.prepare(
                                'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, discount_amount, total_price) VALUES (?, ?, ?, ?, ?, ?)'
                            );
                            order.items.forEach(item => {
                                stmt.run(
                                    orderId,
                                    item.menuItemId || null,
                                    item.quantity,
                                    item.unitPrice.amount,
                                    item.discountAmount || 0,
                                    item.subtotal.amount
                                );
                            });
                            stmt.finalize(err2 => err2 ? rej(err2) : res());
                        });

                        const savedOrder = await self.findById(orderId);
                        resolve(savedOrder);
                    } catch (e) {
                        reject(new DatabaseError(`Failed to save order items: ${e.message}`));
                    }
                }
            );
        });
    }

    async findById(id) {
        const row = await this._fetchOrderRow(id);
        if (!row) return null;
        const items = await this._fetchItems(id);
        return this._rowToOrder(row, items);
    }

    async findAll() {
        return new Promise((resolve, reject) => {
            this.db.all('SELECT id FROM orders ORDER BY created_at DESC', [], async (err, rows) => {
                if (err) return reject(new DatabaseError(`Failed to fetch orders: ${err.message}`));
                try {
                    const orders = await Promise.all(rows.map(r => this.findById(r.id)));
                    resolve(orders.filter(Boolean));
                } catch (e) { reject(e); }
            });
        });
    }

    async findActive() {
        return new Promise((resolve, reject) => {
            this.db.all(
                `SELECT id FROM orders WHERE status NOT IN (?, ?) ORDER BY created_at DESC`,
                [OrderStatus.ENTREGADA, OrderStatus.CANCELADA],
                async (err, rows) => {
                    if (err) return reject(new DatabaseError(`Failed to fetch active orders: ${err.message}`));
                    try {
                        const orders = await Promise.all(rows.map(r => this.findById(r.id)));
                        resolve(orders.filter(Boolean));
                    } catch (e) { reject(e); }
                }
            );
        });
    }

    async findByStatus(status) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT id FROM orders WHERE status = ? ORDER BY updated_at ASC',
                [status],
                async (err, rows) => {
                    if (err) return reject(new DatabaseError(`Failed to fetch orders by status: ${err.message}`));
                    try {
                        const orders = await Promise.all(rows.map(r => this.findById(r.id)));
                        resolve(orders.filter(Boolean));
                    } catch (e) { reject(e); }
                }
            );
        });
    }

    async update(order) {
        return new Promise((resolve, reject) => {
            this.db.serialize(async () => {
                this.db.run('BEGIN TRANSACTION');

                this.db.run(
                    `UPDATE orders SET
                        table_number   = ?,
                        type           = ?,
                        status         = ?,
                        subtotal       = ?,
                        discount_total = ?,
                        tax_total      = ?,
                        total          = ?,
                        notes          = ?,
                        updated_at     = datetime('now','localtime')
                     WHERE id = ?`,
                    [
                        order.tableNumber  || null,
                        order.type         || 'DINE_IN',
                        order.status.value,
                        order.subtotal.amount,
                        order.discountTotal || 0,
                        order.taxTotal      || 0,
                        order.total.amount,
                        order.notes || null,
                        order.id
                    ],
                    (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(new DatabaseError(`Failed to update order: ${err.message}`));
                        }

                        this.db.run('DELETE FROM order_items WHERE order_id = ?', [order.id], (err) => {
                            if (err) {
                                this.db.run('ROLLBACK');
                                return reject(new DatabaseError(`Failed to delete items: ${err.message}`));
                            }

                            const stmt = this.db.prepare(
                                'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, discount_amount, total_price) VALUES (?, ?, ?, ?, ?, ?)'
                            );
                            order.items.forEach(item => {
                                stmt.run(
                                    order.id,
                                    item.menuItemId || null,
                                    item.quantity,
                                    item.unitPrice.amount,
                                    item.discountAmount || 0,
                                    item.subtotal.amount
                                );
                            });

                            stmt.finalize((err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return reject(new DatabaseError(`Failed to insert items: ${err.message}`));
                                }
                                this.db.run('COMMIT');
                                this.findById(order.id).then(resolve).catch(reject);
                            });
                        });
                    }
                );
            });
        });
    }

    async delete(id) {
        const self = this;
        return new Promise((resolve, reject) => {
            self.db.serialize(() => {
                self.db.run('BEGIN TRANSACTION');
                self.db.run('DELETE FROM order_items WHERE order_id = ?', [id], (err) => {
                    if (err) {
                        self.db.run('ROLLBACK');
                        return reject(new DatabaseError(`Failed to delete items: ${err.message}`));
                    }
                    self.db.run('DELETE FROM orders WHERE id = ?', [id], function (err) {
                        if (err) {
                            self.db.run('ROLLBACK');
                            return reject(new DatabaseError(`Failed to delete order: ${err.message}`));
                        }
                        self.db.run('COMMIT');
                        resolve(this.changes > 0); // SQLite statement context
                    });
                });
            });
        });
    }
}

module.exports = OrderRepository;

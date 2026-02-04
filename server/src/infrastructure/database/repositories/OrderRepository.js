const IOrderRepository = require('../../../domain/repositories/IOrderRepository');
const Order = require('../../../domain/entities/Order');
const OrderItem = require('../../../domain/entities/OrderItem');
const OrderStatus = require('../../../domain/value-objects/OrderStatus');
const { DatabaseError, NotFoundError } = require('../../../shared/errors/errorTypes');

/**
 * OrderRepository Implementation
 * Implements IOrderRepository using SQLite
 */
class OrderRepository extends IOrderRepository {
    constructor(database) {
        super();
        this.db = database;
    }

    /**
     * Convert database row to Order entity
     */
    _rowToOrder(row, items = []) {
        return new Order({
            id: row.id,
            tableNumber: row.table_number,
            status: row.status,
            items: items,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            isUpdated: row.is_updated === 1,
            originalItemsSnapshot: row.original_items_snapshot
                ? JSON.parse(row.original_items_snapshot)
                : null
        });
    }

    /**
     * Convert database rows to OrderItem entities
     */
    _rowsToOrderItems(rows) {
        return rows.map(row => new OrderItem({
            id: row.id,
            orderId: row.order_id,
            itemName: row.item_name,
            quantity: row.quantity,
            price: row.price
        }));
    }

    /**
     * Save a new order
     */
    async save(order) {
        return new Promise((resolve, reject) => {
            const total = order.total.amount;

            this.db.run(
                'INSERT INTO orders (table_number, status, total, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
                [order.tableNumber, order.status.value, total, order.createdAt.toISOString(), order.updatedAt.toISOString()],
                function (err) {
                    if (err) {
                        return reject(new DatabaseError(`Failed to save order: ${err.message}`));
                    }

                    const orderId = this.lastID;
                    const stmt = this.db.prepare(
                        'INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)'
                    );

                    // Insert all items
                    const itemPromises = order.items.map(item => {
                        return new Promise((resolveItem, rejectItem) => {
                            stmt.run(
                                orderId,
                                item.itemName,
                                item.quantity,
                                item.price.amount,
                                (err) => {
                                    if (err) rejectItem(err);
                                    else resolveItem();
                                }
                            );
                        });
                    });

                    Promise.all(itemPromises)
                        .then(() => {
                            stmt.finalize();
                            // Fetch the complete order
                            this.findById(orderId)
                                .then(resolve)
                                .catch(reject);
                        })
                        .catch(err => {
                            stmt.finalize();
                            reject(new DatabaseError(`Failed to save order items: ${err.message}`));
                        });
                }.bind(this)
            );
        });
    }

    /**
     * Find order by ID with items
     */
    async findById(id) {
        return new Promise((resolve, reject) => {
            this.db.get(
                'SELECT * FROM orders WHERE id = ?',
                [id],
                (err, orderRow) => {
                    if (err) {
                        return reject(new DatabaseError(`Failed to find order: ${err.message}`));
                    }
                    if (!orderRow) {
                        return resolve(null);
                    }

                    // Fetch order items
                    this.db.all(
                        'SELECT * FROM order_items WHERE order_id = ?',
                        [id],
                        (err, itemRows) => {
                            if (err) {
                                return reject(new DatabaseError(`Failed to fetch order items: ${err.message}`));
                            }

                            const items = this._rowsToOrderItems(itemRows);
                            const order = this._rowToOrder(orderRow, items);
                            resolve(order);
                        }
                    );
                }
            );
        });
    }

    /**
     * Find all orders with items
     */
    async findAll() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM orders ORDER BY created_at DESC',
                [],
                async (err, orderRows) => {
                    if (err) {
                        return reject(new DatabaseError(`Failed to fetch orders: ${err.message}`));
                    }

                    try {
                        const orders = await Promise.all(
                            orderRows.map(row => this.findById(row.id))
                        );
                        resolve(orders);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Find active orders (not paid)
     */
    async findActive() {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM orders WHERE status != ? ORDER BY created_at DESC',
                [OrderStatus.PAID],
                async (err, orderRows) => {
                    if (err) {
                        return reject(new DatabaseError(`Failed to fetch active orders: ${err.message}`));
                    }

                    try {
                        const orders = await Promise.all(
                            orderRows.map(row => this.findById(row.id))
                        );
                        resolve(orders);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Find orders by status
     */
    async findByStatus(status) {
        return new Promise((resolve, reject) => {
            this.db.all(
                'SELECT * FROM orders WHERE status = ? ORDER BY updated_at ASC',
                [status],
                async (err, orderRows) => {
                    if (err) {
                        return reject(new DatabaseError(`Failed to fetch orders by status: ${err.message}`));
                    }

                    try {
                        const orders = await Promise.all(
                            orderRows.map(row => this.findById(row.id))
                        );
                        resolve(orders);
                    } catch (error) {
                        reject(error);
                    }
                }
            );
        });
    }

    /**
     * Update an existing order
     */
    async update(order) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                // Update order
                this.db.run(
                    `UPDATE orders 
                     SET table_number = ?, status = ?, total = ?, updated_at = ?, 
                         is_updated = ?, original_items_snapshot = ?
                     WHERE id = ?`,
                    [
                        order.tableNumber,
                        order.status.value,
                        order.total.amount,
                        order.updatedAt.toISOString(),
                        order.isUpdated ? 1 : 0,
                        order.originalItemsSnapshot ? JSON.stringify(order.originalItemsSnapshot) : null,
                        order.id
                    ],
                    (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(new DatabaseError(`Failed to update order: ${err.message}`));
                        }

                        // Delete old items
                        this.db.run(
                            'DELETE FROM order_items WHERE order_id = ?',
                            [order.id],
                            (err) => {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return reject(new DatabaseError(`Failed to delete old items: ${err.message}`));
                                }

                                // Insert new items
                                const stmt = this.db.prepare(
                                    'INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, ?, ?)'
                                );

                                const itemPromises = order.items.map(item => {
                                    return new Promise((resolveItem, rejectItem) => {
                                        stmt.run(
                                            order.id,
                                            item.itemName,
                                            item.quantity,
                                            item.price.amount,
                                            (err) => {
                                                if (err) rejectItem(err);
                                                else resolveItem();
                                            }
                                        );
                                    });
                                });

                                Promise.all(itemPromises)
                                    .then(() => {
                                        stmt.finalize();
                                        this.db.run('COMMIT');
                                        this.findById(order.id)
                                            .then(resolve)
                                            .catch(reject);
                                    })
                                    .catch(err => {
                                        stmt.finalize();
                                        this.db.run('ROLLBACK');
                                        reject(new DatabaseError(`Failed to insert new items: ${err.message}`));
                                    });
                            }
                        );
                    }
                );
            });
        });
    }

    /**
     * Delete an order
     */
    async delete(id) {
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('BEGIN TRANSACTION');

                // Delete items first
                this.db.run(
                    'DELETE FROM order_items WHERE order_id = ?',
                    [id],
                    (err) => {
                        if (err) {
                            this.db.run('ROLLBACK');
                            return reject(new DatabaseError(`Failed to delete order items: ${err.message}`));
                        }

                        // Delete order
                        this.db.run(
                            'DELETE FROM orders WHERE id = ?',
                            [id],
                            function (err) {
                                if (err) {
                                    this.db.run('ROLLBACK');
                                    return reject(new DatabaseError(`Failed to delete order: ${err.message}`));
                                }

                                this.db.run('COMMIT');
                                resolve(this.changes > 0);
                            }.bind(this)
                        );
                    }
                );
            });
        });
    }
}

module.exports = OrderRepository;

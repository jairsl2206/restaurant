const IOrderRepository = require('../../../domain/repositories/IOrderRepository');
const Order = require('../../../domain/entities/Order');
const OrderItem = require('../../../domain/entities/OrderItem');
const OrderStatus = require('../../../domain/value-objects/OrderStatus');
const { NotFoundError } = require('../../../shared/errors/errorTypes');

/**
 * OrderRepository Implementation
 * Uses DatabaseConnection (Promise-based) instead of raw sqlite3 callbacks.
 * Eliminates N+1 queries by using JOINs.
 */
class OrderRepository extends IOrderRepository {
    constructor(database, promotionRepository) {
        super();
        this.db = database;
        this.promotionRepository = promotionRepository;
    }

    // ── Mappers ──────────────────────────────────────────────────────────────

    async _mapRowsToOrders(orderRows, itemRows) {
        // Group items by order_id
        const itemsByOrderId = itemRows.reduce((acc, row) => {
            if (!acc[row.order_id]) acc[row.order_id] = [];
            acc[row.order_id].push(row);
            return acc;
        }, {});

        // Fetch active promotions once for all orders
        let categoryPromotions = [];
        if (this.promotionRepository) {
            categoryPromotions = await this.promotionRepository.findActive();
        }

        return orderRows.map(row => this._mapRowToOrder(row, itemsByOrderId[row.id] || [], categoryPromotions));
    }

    _mapRowToOrder(row, itemRows = [], categoryPromotions = []) {
        return new Order({
            id: row.id,
            tableNumber: row.table_number,
            status: row.status,
            items: itemRows.map(ir => this._mapRowToOrderItem(ir)),
            categoryPromotions,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            isUpdated: row.is_updated === 1,
            originalItemsSnapshot: row.original_items_snapshot
                ? JSON.parse(row.original_items_snapshot)
                : null,
            customerName: row.customer_name || null,
            phone: row.phone || null,
            address: row.address || null,
            notes: row.notes || null,
            orderType: row.order_type || 'dine-in',
            categoryPromotions
        });
    }

    _mapRowToOrderItem(row) {
        return new OrderItem({
            id: row.id,
            orderId: row.order_id,
            itemName: row.item_name,
            quantity: row.quantity,
            price: row.price,
            category: row.category || 'General'
        });
    }

    _orderToRow(order) {
        return {
            table_number: order.tableNumber,
            status: order.status.value,
            total: order.total.amount,
            is_updated: order.isUpdated ? 1 : 0,
            original_items_snapshot: order.originalItemsSnapshot
                ? JSON.stringify(order.originalItemsSnapshot)
                : null,
            customer_name: order.customerName || null,
            phone: order.phone || null,
            address: order.address || null,
            notes: order.notes || null,
            order_type: order.orderType || 'dine-in',
            updated_at: new Date().toISOString()
        };
    }

    // ── Read Operations ──────────────────────────────────────────────────────

    async findById(id) {
        const [orderRow, itemRows] = await Promise.all([
            this.db.get('SELECT * FROM orders WHERE id = ?', [id]),
            this.db.all('SELECT * FROM order_items WHERE order_id = ?', [id])
        ]);

        if (!orderRow) return null;

        const activePromos = this.promotionRepository ? await this.promotionRepository.findActive() : [];
        return this._mapRowToOrder(orderRow, itemRows, activePromos);
    }

    async findAll() {
        const [orderRows, itemRows] = await Promise.all([
            this.db.all('SELECT * FROM orders ORDER BY created_at DESC'),
            this.db.all('SELECT * FROM order_items')
        ]);
        return this._mapRowsToOrders(orderRows, itemRows);
    }

    async findActive() {
        const placeholders = OrderStatus.ACTIVE_STATUSES.map(() => '?').join(', ');
        const [orderRows, itemRows] = await Promise.all([
            this.db.all(
                `SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY created_at DESC`,
                OrderStatus.ACTIVE_STATUSES
            ),
            this.db.all('SELECT * FROM order_items')
        ]);
        return this._mapRowsToOrders(orderRows, itemRows);
    }

    async findByStatus(status) {
        const [orderRows, itemRows] = await Promise.all([
            this.db.all('SELECT * FROM orders WHERE status = ? ORDER BY updated_at ASC', [status]),
            this.db.all('SELECT * FROM order_items')
        ]);
        return this._mapRowsToOrders(orderRows, itemRows);
    }

    async findPast() {
        const terminalStatuses = [OrderStatus.PAID, OrderStatus.CANCELLED];
        const placeholders = terminalStatuses.map(() => '?').join(', ');
        const [orderRows, itemRows] = await Promise.all([
            this.db.all(
                `SELECT * FROM orders WHERE status IN (${placeholders}) ORDER BY updated_at DESC`,
                terminalStatuses
            ),
            this.db.all('SELECT * FROM order_items')
        ]);
        return this._mapRowsToOrders(orderRows, itemRows);
    }

    // ── Write Operations ─────────────────────────────────────────────────────

    async save(order) {
        const row = this._orderToRow(order);
        const { lastID } = await this.db.run(
            `INSERT INTO orders (table_number, status, total, customer_name, phone, address, notes, order_type, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                row.table_number, row.status, row.total,
                row.customer_name, row.phone, row.address, row.notes, row.order_type,
                new Date().toISOString(), new Date().toISOString()
            ]
        );

        await this._saveItems(lastID, order.items);
        return this.findById(lastID);
    }

    async update(order) {
        const row = this._orderToRow(order);
        await this.db.transaction(async (db) => {
            await db.run(
                `UPDATE orders SET
                    table_number = ?, status = ?, total = ?, updated_at = ?,
                    is_updated = ?, original_items_snapshot = ?,
                    customer_name = ?, phone = ?, address = ?, notes = ?, order_type = ?
                 WHERE id = ?`,
                [
                    row.table_number, row.status, row.total, row.updated_at,
                    row.is_updated, row.original_items_snapshot,
                    row.customer_name, row.phone, row.address, row.notes, row.order_type,
                    order.id
                ]
            );
            await db.run('DELETE FROM order_items WHERE order_id = ?', [order.id]);
            await this._saveItems(order.id, order.items, db);
        });
        return this.findById(order.id);
    }

    async delete(id) {
        // Transaction to delete order and its items
        await this.db.run('BEGIN TRANSACTION');
        try {
            await this.db.run('DELETE FROM order_items WHERE order_id = ?', [id]);
            const { changes } = await this.db.run('DELETE FROM orders WHERE id = ?', [id]);
            await this.db.run('COMMIT');
            return changes > 0;
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    async clearAll() {
        await this.db.run('BEGIN TRANSACTION');
        try {
            await this.db.run('DELETE FROM order_items');
            await this.db.run('DELETE FROM orders');
            await this.db.run('COMMIT');
            return true;
        } catch (error) {
            await this.db.run('ROLLBACK');
            throw error;
        }
    }

    // ── Private Helpers ──────────────────────────────────────────────────────

    async _saveItems(orderId, items, db = this.db) {
        const promises = items.map(item =>
            db.run(
                'INSERT INTO order_items (order_id, item_name, quantity, price, category) VALUES (?, ?, ?, ?, ?)',
                [orderId, item.itemName, item.quantity, item.price.amount, item.category]
            )
        );
        await Promise.all(promises);
    }
}

module.exports = OrderRepository;

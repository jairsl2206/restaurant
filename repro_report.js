const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, 'restaurant.db');
const db = new sqlite3.Database(dbPath);

const itemName = "6 alitas";
const price = 90.0;

console.log('--- REPRO START ---');

db.serialize(() => {
    // 1. Ensure item exists in menu
    db.run("INSERT OR IGNORE INTO menu_items (name, price, category, available) VALUES (?, ?, 'Entrada', 1)", [itemName, price]);

    // 2. Create a COMPLETED order with this item
    db.run("INSERT INTO orders (table_number, total, status, created_at, updated_at) VALUES (1, ?, 'FINALIZADA', '2026-02-11 12:00:00', '2026-02-11 12:05:00')", [price], function (err) {
        if (err) return console.error(err);
        const orderId = this.lastID;
        console.log(`Order created: ${orderId}`);

        db.run("INSERT INTO order_items (order_id, item_name, quantity, price) VALUES (?, ?, 1, ?)", [orderId, itemName, price], function (err) {
            if (err) return console.error(err);
            console.log('Item added to order');

            // 3. Check report
            const sqlItems = `
                SELECT 
                    oi.item_name, 
                    SUM(oi.quantity) as quantity_sold, 
                    SUM(oi.price * oi.quantity) as item_revenue 
                FROM order_items oi
                JOIN orders o ON oi.order_id = o.id
                WHERE o.status = 'FINALIZADA' 
                AND o.created_at BETWEEN '2026-02-11 00:00:00' AND '2026-02-11 23:59:59'
                GROUP BY oi.item_name
                ORDER BY quantity_sold DESC
            `;

            db.all(sqlItems, [], (err, rows) => {
                if (err) return console.error(err);
                console.log('--- REPORT OUTPUT ---');
                console.log(rows);

                // Cleanup (optional, but good for local testing)
                // db.run("DELETE FROM order_items WHERE order_id = ?", [orderId]);
                // db.run("DELETE FROM orders WHERE id = ?", [orderId]);

                db.close();
            });
        });
    });
});

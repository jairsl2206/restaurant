const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    console.log("--- Checking 'orders' table info ---");
    db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (err) {
            console.error("Error getting table info:", err);
            return;
        }
        console.log(rows);

        const hasSnapshot = rows.some(r => r.name === 'original_items_snapshot');
        console.log("Has original_items_snapshot column?", hasSnapshot);
    });

    console.log("\n--- Checking recent orders ---");
    db.all("SELECT id, status, is_updated, original_items_snapshot FROM orders ORDER BY id DESC LIMIT 5", (err, rows) => {
        if (err) console.error(err);
        else console.log(rows);
    });
});

db.close();

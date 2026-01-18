const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

db.serialize(() => {
    console.log("Adding original_items_snapshot column...");
    db.run("ALTER TABLE orders ADD COLUMN original_items_snapshot TEXT", (err) => {
        if (err) {
            console.error("Migration mismatch/error:", err.message);
        } else {
            console.log("Migration successful!");
        }
    });

    // Check if it exists now
    db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (err) console.error(err);
        else {
            const col = rows.find(r => r.name === 'original_items_snapshot');
            console.log("Column verification:", col); // Should print object
        }
    });
});

db.close();

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../restaurant.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("PRAGMA table_info(orders)", (err, rows) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log('Orders Table Schema (JSON):');
        console.log(JSON.stringify(rows, null, 2));
    });
});

db.close();

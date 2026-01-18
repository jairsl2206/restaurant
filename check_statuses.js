const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'restaurant.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.all("SELECT id, status, description FROM orders", (err, rows) => {
        if (err) {
            console.error(err);
        } else {
            console.log('Order Statuses:', rows);
        }
        db.close();
    });
});

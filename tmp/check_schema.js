
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(dbPath);

console.log('Checking order_items schema...');
db.all("PRAGMA table_info(order_items)", (err, rows) => {
    if (err) {
        console.error(err);
    } else {
        console.log('Columns in order_items:');
        rows.forEach(row => console.log(`- ${row.name} (${row.type})${row.notnull ? ' NOT NULL' : ''}`));
    }
    db.close();
});

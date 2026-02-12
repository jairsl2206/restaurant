const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

db.all('SELECT name, category FROM menu_items WHERE category IS NULL OR category = \'\'', [], (err, rows) => {
    if (err) {
        console.error('Error:', err);
    } else {
        console.log(`Items sin categoría: ${rows.length}`);
        rows.forEach(r => console.log(`  - ${r.name} (category: "${r.category}")`));
    }
    db.close();
});

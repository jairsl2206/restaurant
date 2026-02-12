const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(dbPath);

console.log('--- DB SANITIZATION START ---');

const cleanItemName = (str) => {
    let current = str.trim();
    let changed = true;
    while (changed) {
        changed = false;
        // Match " xQuantity [Price]" at the end
        const fullSuffixMatch = current.match(/(.+) x\d+(\.\d+)?( \[(\d+\.?\d*)\])?$/);
        if (fullSuffixMatch) {
            current = fullSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        // Match just " [Price]" at the end
        const priceSuffixMatch = current.match(/(.+) \[(\d+\.?\d*)\]$/);
        if (priceSuffixMatch) {
            current = priceSuffixMatch[1].trim();
            changed = true;
            continue;
        }
        // Match just " xQuantity" at the end
        const qtySuffixMatch = current.match(/(.+) x\d+$/);
        if (qtySuffixMatch) {
            current = qtySuffixMatch[1].trim();
            changed = true;
        }
    }
    return current;
};

db.serialize(() => {
    db.all("SELECT id, item_name FROM order_items", [], (err, rows) => {
        if (err) {
            console.error('Error selecting order_items:', err);
            return;
        }

        let updatedCount = 0;
        let skippedCount = 0;

        const updatePromises = rows.map(row => {
            const cleaned = cleanItemName(row.item_name);
            if (cleaned !== row.item_name) {
                return new Promise((resolve) => {
                    db.run("UPDATE order_items SET item_name = ? WHERE id = ?", [cleaned, row.id], (err) => {
                        if (err) {
                            console.error(`Failed to update item ${row.id}:`, err);
                        } else {
                            updatedCount++;
                            console.log(`Cleaned: "${row.item_name}" -> "${cleaned}"`);
                        }
                        resolve();
                    });
                });
            } else {
                skippedCount++;
                return Promise.resolve();
            }
        });

        Promise.all(updatePromises).then(() => {
            console.log('--- SANITIZATION SUMMARY ---');
            console.log(`Total items checked: ${rows.length}`);
            console.log(`Items cleaned: ${updatedCount}`);
            console.log(`Items already clean: ${skippedCount}`);
            db.close();
            console.log('--- DB SANITIZATION END ---');
        });
    });
});

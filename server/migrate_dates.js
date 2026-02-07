const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');
const db = new sqlite3.Database(DB_PATH);

console.log('--- Database Migration: Fixing Date Formats ---');
console.log(`Connecting to: ${DB_PATH}`);

db.serialize(() => {
    // Check how many rows need fixing
    db.get("SELECT COUNT(*) as count FROM orders WHERE created_at LIKE '%/%' OR updated_at LIKE '%/%'", (err, row) => {
        if (err) {
            console.error('Error checking database:', err.message);
            process.exit(1);
        }

        console.log(`Found ${row.count} orders with incorrect date format (YYYY/MM/DD).`);

        if (row.count === 0) {
            console.log('No migration needed. All dates are already in the correct format or database is empty.');
            db.close();
            process.exit(0);
        }

        console.log('Migrating dates...');

        // Update created_at and updated_at by replacing / with -
        db.run(
            "UPDATE orders SET created_at = replace(created_at, '/', '-'), updated_at = replace(updated_at, '/', '-') WHERE created_at LIKE '%/%' OR updated_at LIKE '%/%'",
            function (err) {
                if (err) {
                    console.error('Error during migration:', err.message);
                    process.exit(1);
                }

                console.log(`Migration successful! ${this.changes} rows updated.`);

                // Final check
                db.get("SELECT created_at FROM orders LIMIT 1", (err, row) => {
                    if (row) {
                        console.log('Sample updated date:', row.created_at);
                    }
                    db.close();
                    console.log('Done.');
                    process.exit(0);
                });
            }
        );
    });
});

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { ORDER_STATUS } = require('./constants');

const DB_PATH = path.join(__dirname, '..', 'restaurant.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
        process.exit(1);
    }
    console.log('Connected to database to migrate statuses...');
});

const mappings = [
    { old: 'En Cocina', new: ORDER_STATUS.COOKING },
    { old: 'Creado', new: ORDER_STATUS.COOKING },
    { old: 'Listo para Servir', new: ORDER_STATUS.READY },
    { old: 'Servido', new: ORDER_STATUS.SERVED },
    { old: 'Pagado', new: ORDER_STATUS.COMPLETED },
    { old: 'Cancelado', new: ORDER_STATUS.CANCELLED },
    { old: 'En Reparto', new: ORDER_STATUS.DELIVERING }
];

db.serialize(() => {
    db.run('BEGIN TRANSACTION');

    let completed = 0;
    mappings.forEach(map => {
        // Use COLLATE NOCASE for case-insensitive matching
        db.run(`UPDATE orders SET status = ? WHERE status = ? COLLATE NOCASE`, [map.new, map.old], function (err) {
            if (err) {
                console.error(`Error migrating ${map.old} -> ${map.new}:`, err);
                db.run('ROLLBACK');
                process.exit(1);
            }
            if (this.changes > 0) {
                console.log(`Migrated ${this.changes} orders from '${map.old}' to '${map.new}'`);
            }

            completed++;
            if (completed === mappings.length) {
                db.run('COMMIT', (err) => {
                    if (err) {
                        console.error('Error committing transaction:', err);
                        process.exit(1);
                    }
                    console.log('Migration completed successfully.');
                    db.close();
                });
            }
        });
    });
});

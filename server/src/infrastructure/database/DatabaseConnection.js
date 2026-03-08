const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { DatabaseError } = require('../../shared/errors/errorTypes');

/**
 * DatabaseConnection
 * Encapsulates the SQLite connection and exposes Promise-based methods.
 * This is the ONLY place where SQLite is imported in the Clean Architecture layer.
 */
class DatabaseConnection {
    constructor(dbPath) {
        const resolvedPath = dbPath || path.join(__dirname, '../../../../restaurant.db');
        this._db = new sqlite3.Database(resolvedPath, (err) => {
            if (err) {
                throw new DatabaseError(`Failed to connect to database: ${err.message}`);
            }
        });
        // Enable WAL mode for better concurrency
        this._db.run('PRAGMA journal_mode=WAL');
        this._db.run('PRAGMA foreign_keys=ON');
    }

    /**
     * Execute a query that modifies data (INSERT, UPDATE, DELETE)
     * @returns {Promise<{lastID: number, changes: number}>}
     */
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this._db.run(sql, params, function (err) {
                if (err) {
                    reject(new DatabaseError(`Query failed: ${err.message}\nSQL: ${sql}`));
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    /**
     * Execute a query that retrieves a single row
     * @returns {Promise<Object|null>}
     */
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this._db.get(sql, params, (err, row) => {
                if (err) {
                    reject(new DatabaseError(`Query failed: ${err.message}\nSQL: ${sql}`));
                } else {
                    resolve(row || null);
                }
            });
        });
    }

    /**
     * Execute a query that retrieves multiple rows
     * @returns {Promise<Object[]>}
     */
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this._db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(new DatabaseError(`Query failed: ${err.message}\nSQL: ${sql}`));
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    /**
     * Execute multiple statements in a transaction
     * @param {Function} callback - async function that receives this DatabaseConnection instance
     * @returns {Promise<*>}
     */
    async transaction(callback) {
        await this.run('BEGIN TRANSACTION');
        try {
            const result = await callback(this);
            await this.run('COMMIT');
            return result;
        } catch (err) {
            await this.run('ROLLBACK');
            throw err;
        }
    }

    /**
     * Execute multiple SQL statements (for initialization)
     * @returns {Promise<void>}
     */
    exec(sql) {
        return new Promise((resolve, reject) => {
            this._db.exec(sql, (err) => {
                if (err) reject(new DatabaseError(`Exec failed: ${err.message}`));
                else resolve();
            });
        });
    }

    close() {
        return new Promise((resolve, reject) => {
            this._db.close((err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /** Expose raw db only when absolutely necessary (legacy shim) */
    get raw() {
        return this._db;
    }
}

module.exports = DatabaseConnection;

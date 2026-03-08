/**
 * AppConfig
 * Single place where all environment variables are read and validated.
 * External layers should import from this module instead of using process.env directly.
 */
class AppConfig {
    constructor() {
        this._config = {
            port: parseInt(process.env.PORT, 10) || 3001,
            nodeEnv: process.env.NODE_ENV || 'development',
            dbPath: process.env.DB_PATH || null,
            jwtSecret: process.env.JWT_SECRET || 'restaurant-pos-secret-key-change-in-production',
            jwtExpiresIn: process.env.JWT_EXPIRES_IN || '6h',
        };

        this._validateRequiredVars();
    }

    _validateRequiredVars() {
        const warnings = [];

        if (!process.env.JWT_SECRET) {
            warnings.push('JWT_SECRET is not set — using insecure default. Set it in your .env file!');
        }
        if (!process.env.DB_PATH) {
            warnings.push('DB_PATH is not set — using default path (restaurant.db in root)');
        }

        if (warnings.length > 0 && this._config.nodeEnv === 'production') {
            // In production, missing vars are errors
            if (!process.env.JWT_SECRET) {
                throw new Error('FATAL: JWT_SECRET must be set in production');
            }
        }

        // Log warnings (avoid requiring logger here to prevent circular deps)
        warnings.forEach(w => console.warn(`[AppConfig] ⚠️  ${w}`));
    }

    get port() { return this._config.port; }
    get nodeEnv() { return this._config.nodeEnv; }
    get dbPath() { return this._config.dbPath; }
    get jwtSecret() { return this._config.jwtSecret; }
    get jwtExpiresIn() { return this._config.jwtExpiresIn; }
    get isProduction() { return this._config.nodeEnv === 'production'; }
    get isDevelopment() { return this._config.nodeEnv === 'development'; }
}

// Export as singleton
module.exports = new AppConfig();

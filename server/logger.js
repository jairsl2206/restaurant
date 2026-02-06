const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const logFormat = winston.format.printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `[${timestamp}] [${level.toUpperCase()}]: ${message}`;
    if (Object.keys(metadata).length > 0 && level !== 'info') {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: () => new Date().toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })
        }),
        winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'label'] }),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                logFormat
            )
        }),
        new winston.transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

module.exports = logger;

const winston = require("winston");

const { LOG_FILE_PATH, SECURITY_LOG_FILE_PATH } = require("./config.js");

const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.errors({stack: true}),
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: LOG_FILE_PATH })
    ],
});

const loginLogger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.errors({stack: true}),
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
    ),
    transports: [
        new winston.transports.File({ filename: SECURITY_LOG_FILE_PATH })
    ],
})

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.errors({stack: true}),
            winston.format.colorize(),
            logger.format,
        )
    }));
}

/**
 * Middleware: log where this request came from, and what it wants
 */
const requestLogger = async (req, _res, next) => {
    logger.info(`${req.ip} ${req.method} ${req.url}`);
    next();
}

/**
 * Log the given error if defined
 * @param {Error} err
 */
const errorLogger = async (err) => {
    if (err) {
        logger.error(err)
    }
}

module.exports = {
    logger,
    loginLogger,
    requestLogger,
    errorLogger,
};

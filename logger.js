const winston = require("winston");

const {
    LOG_FILE_PATH,
    SECURITY_LOG_FILE_PATH,
    ERROR_LOG_FILE_PATH,
} = require("./config.js");

const logFormat = winston.format.combine(
    winston.format.errors({stack: true}),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const infoLogger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        new winston.transports.File({ filename: LOG_FILE_PATH })
    ],
});

const securityLogger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        new winston.transports.File({ filename: SECURITY_LOG_FILE_PATH })
    ],
})

const errorLogger = winston.createLogger({
    level: "error",
    format: logFormat,
    transports: [
        new winston.transports.File({ filename: ERROR_LOG_FILE_PATH })
    ],
})

if (process.env.NODE_ENV !== 'production') {
    const consoleTransport = new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            logFormat,
        )
    });
    infoLogger.add(consoleTransport);
    securityLogger.add(consoleTransport);
    errorLogger.add(consoleTransport);
}

const logger = {
    info: async (msg) => infoLogger.info(msg),
    security: async (msg) => securityLogger.info(msg),
    // having a context makes it easier to locate the whereabouts of the error,
    // as well as not logging false positives (after a promise, the error itself
    // may be undefined, even if it is caught; if simply appending the error to
    // the context, an undefined error may get printed out)
    error: async (context, err) => {
        if (err) {
            errorLogger.error(`${context}: ${err}`);
        }
    },
}

/**
 * Middleware: log where this request came from, and what it wants
 */
const requestLogger = async (req, _res, next) => {
    logger.info(`${req.ip} ${req.method} ${req.url}`);
    next();
}

module.exports = {
    logger,
    requestLogger,
};

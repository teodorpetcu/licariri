const winston = require("winston");

const logFormat = winston.format.combine(
    winston.format.errors({stack: true}),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
);

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        logFormat,
    )
});

const _logger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        consoleTransport,
    ],
});

const logger = {
    info: async (msg) => _logger.info(msg),
    security: async (msg) => _logger.info(msg),
    // having a context makes it easier to locate the whereabouts of the error,
    // as well as not logging false positives (after a promise, the error itself
    // may be undefined, even if it is caught; if simply appending the error to
    // the context, an undefined error may get printed out)
    error: async (context, err) => {
        if (err) {
            _logger.error(`${context}: ${err}`);
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

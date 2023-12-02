const sqlite3 = require("sqlite3");

const { logger } = require("../logger.js");

class Database {
    /**
     * Open an SQLITE connection to the given path
     * @param {string} path
     */
    constructor(path) {
        this.path = path;
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                logger.error(`database '${this.path}': ${err}`);
            } else {
                logger.info(`database '${this.path}': ok`);
            }
        })
    }
}

module.exports = {
    Database,
};

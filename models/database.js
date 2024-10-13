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
                this.dbLogger.error("connecting", err);
            } else {
                this.dbLogger.info("connection ok");
            }
        })
    }

    close = async () => {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    this.dbLogger.error("closing database connection", err)
                    return reject(err);
                } else {
                    this.dbLogger.info("close ok")
                    return resolve();
                }
            });
        })
    }

    dbLogger = {
        info: async (msg) => {
            logger.info(`(database '${this.name}') ${msg}`);
        },
        error: async (context, err) => {
            logger.error(`(database '${this.name}') ${context}`, err)
        }
    }

    get = async (stmt, data) => {
        return new Promise((resolve, reject) => {
            this.db.get(stmt, data, (err, row) => {
                if (err) {
                    reject(err);
                } else if (row === undefined) {
                    reject(undefined);
                } else {
                    resolve(row);
                }
            })
        })
    }

    all = async (stmt, data) => {
        return new Promise((resolve, reject) => {
            this.db.all(stmt, data, (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows === undefined) {
                    reject(undefined);
                } else {
                    resolve(rows);
                }
            })
        })
    }

    run = async (stmt, data) => {
        return new Promise((resolve, reject) => {
            this.db.run(stmt, data, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(undefined);
                }
            })
        })
    }

    exec = async (stmt) => {
        return new Promise((resolve, reject) => {
            this.db.exec(stmt, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(undefined);
                }
            })
        })
    }
}

module.exports = {
    Database,
};

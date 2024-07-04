const { PDFPrint } = require("./types.js");
const { Database } = require("./database.js");
const { logger } = require("../logger.js");

class PDFPrintsDatabase extends Database {
    /**
     * Interpret the database at the given path as for storing metadata about
     * PDF prints of the magazine
     * @param {string} path
     */
    constructor(path) {
        super(path);
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    // TODO: return status
    init = () => {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS pdfprints
            (
                timestamp           INT,
                description         TEXT,
                UNIQUE (description)
            );
        `, (err) => {
                if (err) {
                    logger.error(`database '${this.path}' tables: ${err}`);
                } else {
                    logger.info(`database '${this.path}' tables: ok`);
                }
            }
        );
    }

    /**
     * @param {PDFPrint} pdfprint
     */
    addPDFPrint = (pdfprint) => {
        this.db.run(`INSERT OR IGNORE into pdfprints VALUES (?, ?)`,
            [pdfprint.timestamp, pdfprint.description],
            this.errorLogger
        );
    }
}

module.exports = {
    PDFPrintsDatabase,
};

const { Database } = require("./database.js");

class QueryDatabase extends Database {
    /**
     * Interpret the database at the given path as a query database
     * @param {string} path
     */
    constructor(path) {
        super(path);
    }

    /**
     * Create the database tables if they don't exist already.
     */
    init = () => {
        this.db.exec(`CREATE TABLE IF NOT EXISTS query
            (
                word            TEXT NOT NULL,
                article_id      TEXT NOT NULL,
                UNIQUE (word, article_id)
            )`,
            (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`database '${this.path}' tables: ok`);
                }
            });
    }
}

module.exports = {
    QueryDatabase
};

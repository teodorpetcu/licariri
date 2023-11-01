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
        // This can be further optimised space-wise by creating a table which
        // contains all the words, therefore making the mappings table contain
        // only pairs of indexes, thereby making the cost of repetition minimal
        this.db.exec(`CREATE TABLE IF NOT EXISTS mappings
            (
                id              INT,
                word            TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (rowid)
            );
            CREATE TABLE IF NOT EXISTS articles
            (
                article_id      TEXT NOT NULL
            );`,
            (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`database '${this.path}' tables: ok`);
                }
            });
    }

    /**
     * Associate every unique word in the `contents` field with the provided ID
     * @param {string} id - Article ID
     * @param {string} contents - Contents of the article
     */
    indexArticle = async (id, contents) => {
        let uniqueWords = [... new Set(contents.replace(/[^A-z\-]/g, " ").split(/\s+/))];
        this.db.serialize(() => {
            let rowid = 1;
            this.db.get("SELECT last_insert_rowid() as rowid", (err, row) => {
                // TODO: handle
                if (err) {
                    console.error(err);
                } else {
                    rowid = row.rowid + 1;
                    let stmt = this.db.prepare("INSERT INTO mappings VALUES (?, ?)");
                    for (let word of uniqueWords) {
                        stmt.run([rowid, word]);
                    }
                    stmt.finalize((err) => {
                        if (!err) {
                            this.db.run("INSERT INTO articles VALUES (?)", [id]);
                        }
                    });
                }
            })
        });
    }
}

module.exports = {
    QueryDatabase
};

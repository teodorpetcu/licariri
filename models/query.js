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
        // I sure hope this approach is faster than reading all files and
        // scanning them?
        this.db.exec(`CREATE TABLE IF NOT EXISTS mappings
            (
                article     INT,
                word        INT,
                FOREIGN KEY (article) REFERENCES articles (rowid),
                FOREIGN KEY (word) REFERENCES words (rowid)
            );
            CREATE TABLE IF NOT EXISTS words
            (
                word            TEXT NOT NULL,
                UNIQUE (word)
            );
            CREATE TABLE IF NOT EXISTS articles
            (
                article_id      TEXT NOT NULL,
                UNIQUE (article_id)
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
        let uniqueWords = [... new Set(contents.toLowerCase().replace(/[^0-9A-z\-'ăîâșțéèÿùüïôœàæêëûîâç]/g, " ").split(/\s+/))];
        this.db.serialize(() => {
            this.db.get("SELECT last_insert_rowid() as rowid", (err, row) => {
                // TODO: handle
                if (err) {
                    console.error(err);
                } else {
                    let rowid = row.rowid + 1;
                    let words_stmt = this.db.prepare("INSERT OR IGNORE INTO words VALUES (?)");
                    let stmt = this.db.prepare("INSERT INTO mappings VALUES (?, (SELECT rowid FROM words WHERE word = ?))");
                    for (let word of uniqueWords) {
                        words_stmt.run([word]);
                        stmt.run([rowid, word]);
                    }
                    words_stmt.finalize((err) => {
                        if (!err) {
                            stmt.finalize((err) => {
                                if (!err) {
                                    this.db.run("INSERT INTO articles VALUES (?)", [id]);
                                }
                            });
                        }
                    });
                }
            })
        });
    }

    /**
     * Return a list of all article IDs that contain the given pattern in their
     * text
     * @param {string} pattern
     * @returns {Promise<string[]>}
     */
    findArticles = (pattern) => {
        pattern = '%' + pattern + '%';
        return new Promise((resolve) => {
            this.db.all(`SELECT article_id FROM articles
                WHERE rowid IN
                    (SELECT article FROM mappings
                        WHERE word IN
                            (SELECT rowid FROM words WHERE word LIKE ?))`,
                [pattern],
                (err, rows) => {
                    if (err) {
                        // TODO: handle
                        console.error(err);
                    } else {
                        return resolve(rows.map((r) => r.article_id));
                    }
                }
            );
        })
    }
}

module.exports = {
    QueryDatabase
};

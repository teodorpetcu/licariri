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
        // TODO: make more efficient space-wise by associating a word with a
        // number and having that number map to an article ID inside a different
        // table
        this.db.exec(`CREATE TABLE IF NOT EXISTS words
            (
                article_id      TEXT NOT NULL,
                word            TEXT NOT NULL,
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

    /**
     * Associate every unique word in the `contents` field with the provided ID
     * @param {string} id - Article ID
     * @param {string} contents - Contents of the article
     */
    indexArticle = async (id, contents) => {
        let uniqueWords = [... new Set(contents.replace(/[^A-z\-]/g, " ").split(/\s+/))];
        this.db.serialize(() => {
            let stmt = this.db.prepare("INSERT INTO words VALUES (?, ?)");
            for (let word of uniqueWords) {
                stmt.run([id, word]);
            }
            stmt.finalize();
        });
    }
}

module.exports = {
    QueryDatabase
};

const { Database } = require("./database.js");
const { logger } = require("../logger.js");
const { QUERY_DATABASE_PATH } = require("../config.js");

class QueryDatabase extends Database {
    /**
     * Interpret the database at the given path as a query database
     * @param {string} path
     */
    constructor(path) {
        super(path);
        this.name = "query";
    }

    /**
     * Create the database tables if they don't exist already.
     * @returns {Promise<undefined>}
     */
    init = async () => {
        return this.exec(
            `CREATE TABLE IF NOT EXISTS mappings
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
            );`
        )
    }

    /**
     * Associate every unique word in the `contents` field with the provided ID
     * @param {string} id - Article ID
     * @param {string} contents - Contents of the article
     */
    indexArticle = async (id, contents) => {
        let lowercase = contents.toLowerCase();
        let validWords = lowercase.replace(/[^0-9A-z\-'ăîâșțéèÿùüïôœàæêëûîâç]/g, " ").split(/\s+/);
        let uniqueWords = [... new Set(validWords.filter((word) => word))];
        return this.run("INSERT INTO articles VALUES (?)", [id])
            .then(async () => {
                this.get("SELECT rowid as num FROM articles WHERE article_id = ?", [id])
                    .then((row) => {
                        let rowid = row.num;
                        let words_stmt = this.db.prepare("INSERT OR IGNORE INTO words VALUES (?)");
                        let stmt = this.db.prepare("INSERT INTO mappings VALUES (?, (SELECT rowid FROM words WHERE word = ?))");
                        for (let word of uniqueWords) {
                            words_stmt.run([word], this.dbLogger.error);
                            stmt.run([rowid, word], this.dbLogger.error);
                        }
                        words_stmt.finalize((err) => {
                            if (err) {
                                Promise.reject(err);
                            } else {
                                stmt.finalize(this.dbLogger.error);
                            }
                        });
                    })
                    .catch((err) => this.dbLogger.error(`indexing article`, err));
            })
            .catch((err) => this.dbLogger.error(`adding article to query database`, err));
    }

    /**
     * Remove the word mappings for the article with the given ID, including the
     * entry for the article itself, from the database
     *
     * Note that this does not remove the words, even if they remain unmapped to
     * anything.
     * @param {string} article_id
     */
    unindexArticle = async (article_id) => {
        return this.run("DELETE FROM mappings WHERE rowid IN (SELECT rowid FROM articles WHERE article_id = ?)", [article_id])
            .then(() => this.run("DELETE FROM articles WHERE article_id = ?", [article_id]))
            .catch((err) => this.dbLogger.error(`UNindexing article`, err));
    }

    /**
     * Return a list of the article IDs that contain *all* the given
     * words/patterns (delimited by whitespace) in their text
     *
     * @param {string} words
     * @returns {Promise<string[]>}
     */
    findArticles = async (words) => {
        words = words.split(" ").map((word) => `%${word}%`);
        let stmt = "";
        for (let i = 0; i < words.length; i++) {
            if (i != 0) {
                stmt += `INTERSECT\n`;
            }
            stmt += `SELECT article_id FROM articles
                WHERE rowid IN
                    (SELECT article FROM mappings
                        WHERE word IN
                            (SELECT rowid FROM words WHERE word LIKE ?))\n`;
        }

        return this.all(stmt, words)
            .then((rows) => rows.map((row) => row.article_id))
            .catch((err) => this.dbLogger.error(`finding articles`, err));
    }
}

const queryDatabase = new QueryDatabase(QUERY_DATABASE_PATH);

module.exports = {
    queryDatabase
};

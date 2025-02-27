const { Database } = require("./database.js");
const { logger } = require("../logger.js");
const { VIEWS_DATABASE_PATH } = require("../config.js");

class ViewsDatabase extends Database {
    /**
     * @param {string} path
     */
    constructor(path) {
        super(path);
        this.name = "views";
    }

    /**
     * Initialise the database tables if they haven't already been created
     * @returns {Promise}
     */
    init = async () => {
        return this.exec(
            `CREATE TABLE IF NOT EXISTS article_requests
            (
                timestamp           INT,
                ip                  TEXT NOT NULL,
                article_requested   TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS article_views
            (
                article_id          TEXT NOT NULL,
                unique_views        INT,
                UNIQUE (article_id)
            );`
        )
    }

    /**
     * @param {int}     timestamp
     * @param {string}  ip
     * @param {string}  articleID
     */
    logRequest = async (timestamp, ip, articleID) => {
        return this.run("INSERT INTO article_requests VALUES (?, ?, ?)", [timestamp, ip, articleID])
            .catch((err) => this.dbLogger.error(`logging request to article`, err));
    }

    /**
     * Running this operation on every new request would be extremely expensive,
     * so we don't do that.
     */
    updateArticleViews = async () => {
        return this.run('INSERT OR REPLACE INTO article_views SELECT article_requested, COUNT(DISTINCT ip) FROM article_requests GROUP BY article_requested')
            .catch((err) => this.dbLogger.error(`updating article views`, err));
    }

    /**
     * @param {string} id
     * @returns {Promise<int>}
     */
    getArticleViews = async (id) => {
        return this.all('SELECT unique_views FROM article_views WHERE article_id = ?', [id])
            .then(() => {
                return rows[0].unique_views;
            })
            .catch((err) => {
                this.dbLogger.error(`getting article views`, err);
                return 0;
            });
    }

    /**
     * For when the ID of an article changes.
     * @param {string} originalID
     * @param {string} newID
     */
    renameArticle = async (originalID, newID) => {
        return Promise.all([
            this.run('UPDATE article_views SET article_id = ? WHERE article_id = ?', [newID, originalID]),
            this.run('UPDATE article_requests SET article_requested = ? WHERE article_requested = ?', [newID, originalID]),
        ]).catch((err) => this.dbLogger.error(`renaming article`, err))
    }
}

const viewsDatabase = new ViewsDatabase(VIEWS_DATABASE_PATH);

module.exports = {
    viewsDatabase,
}

const { Database } = require("./database.js");
const { logger } = require("../logger.js");
const { VIEWS_DATABASE_PATH } = require("../config.js");

class ViewsDatabase extends Database {
    /**
     * @param {string} path
     */
    constructor(path) {
        super(path);
    }

    init = () => {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS article_requests
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
            );
            `, (err) => {
                if (err) {
                    logger.error(`database '${this.path}' tables: ${err}`);
                } else {
                    logger.info(`database '${this.path}' tables: ok`);
                }
            }
        )
    }

    /**
     * @param {int}     timestamp
     * @param {string}  ip
     * @param {string}  articleID
     */
    logRequest = async (timestamp, ip, articleID) => {
        this.db.run("INSERT INTO article_requests VALUES (?, ?, ?)", [timestamp, ip, articleID], this.errorLogger);
    }

    /**
     * Running this operation on every new request would be extremely expensive,
     * so we don't do that.
     */
    updateArticleViews = () => {
        this.db.run('INSERT OR REPLACE INTO article_views SELECT article_requested, COUNT(DISTINCT ip) FROM article_requests GROUP BY article_requested', this.errorLogger);
    }

    /**
     * @param {string} id
     * @returns {Promise<int>}
     */
    getArticleViews = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT unique_views FROM article_views WHERE article_id = ?', [id], (err, rows) => {
                if (err) {
                    logger.error(`getting article views: ${err}`);
                    return resolve(0);
                } else if (rows === undefined || !rows.length) {
                    return resolve(0);
                }
                return resolve(rows[0].unique_views);
            });
        });
    }

    /**
     * For when the ID of an article changes.
     * @param {string} originalID
     * @param {string} newID
     */
    renameArticle = async (originalID, newID) => {
        this.db.run('UPDATE article_views SET article_id = ? WHERE article_id = ?', [newID, originalID], this.errorLogger);
        this.db.run('UPDATE article_requests SET article_requested = ? WHERE article_requested = ?', [newID, originalID], this.errorLogger);
    }
}

const viewsDatabase = new ViewsDatabase(VIEWS_DATABASE_PATH);
viewsDatabase.init();

module.exports = {
    viewsDatabase,
}

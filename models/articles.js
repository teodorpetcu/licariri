const { Author, Article } = require("./types.js");
const { Database } = require("./database.js");
const { logger } = require("../logger.js");

class ArticleDatabase extends Database {
    /**
     * Interpret the database at the given path as for article storage
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
            CREATE TABLE IF NOT EXISTS articles
            (
                id          TEXT NOT NULL,
                user        TEXT NOT NULL,
                title       TEXT NOT NULL,
                timestamp   INT,
                thumbnail   TEXT NOT NULL,
                UNIQUE (id)
            );
            CREATE TABLE IF NOT EXISTS article_tags
            (
                id      TEXT NOT NULL,
                tag     TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_authors
            (
                id                  TEXT NOT NULL,
                author              TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );`, (err) => {
                if (err) {
                    logger.error(`database '${this.path}' tables: ${err}`);
                } else {
                    logger.info(`database '${this.path}' tables: ok`);
                }
            }
        );
    }

    /**
     * Save an article's metadata to a database
     * @param {Article} article
     * @param {string} user_id
     */
    // TODO: handle errors via callbacks on the 'exec' statements
    saveArticle = (article, user_id) => {
        this.db.run('INSERT INTO articles VALUES(?, ?, ?, ?, ?)',
            [article.id, user_id, article.title, article.timestamp, article.thumbnail ? article.thumbnail : ""]);
        for (let tag of article.tags) {
            this.db.run('INSERT INTO article_tags VALUES(?, ?)',
                [article.id, tag]);
        }
        for (let author of article.authors) {
            this.db.run('INSERT INTO article_authors VALUES(?, ?)',
                [article.id, author.name]);
        }
    }

    /**
     * Remove all entries in the database associated with the given ID
     * @param {id} - Article ID
     */
    removeArticle = async (id) => {
        return new Promise((resolve) => {
            this.db.run('DELETE from articles WHERE id = ?', [id]);
            this.db.run('DELETE from article_authors WHERE id = ?', [id]);
            this.db.run('DELETE from article_tags WHERE id = ?', [id]);
            return resolve();
        });
    }

    /**
     * Return the list of article IDs that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "user", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * @param {string|undefined} key - Valid values are
     * @param {string} value
     * @returns {Promise<string[]|undefined>}
     */
    searchArticleIDs = async (key, value, exact = false) => {
        return new Promise((resolve) => {
            let validKeyValues = ["title", "user", "tag", "author", undefined]
            if (! validKeyValues.includes(key)) {
                return resolve(undefined);
            }

            let table = "articles";
            if (key == "tag") {
                table = "article_tags";
            } else if (key == "author") {
                table = "article_authors";
            }

            let stmt = `SELECT id FROM ${table}`;
            if (key == undefined){
                stmt = `SELECT id FROM articles`;
            } else if (exact) {
                stmt += ` WHERE ${key} = ?`;
            } else {
                stmt += ` WHERE ${key} LIKE ?`;
                value = `%${value}%`;
            }

            this.db.all(stmt, [value], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.id));
            });
        });
    }

    /**
     * Return the list of articles that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "user",
     * "author", "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * @param {string|undefined} key
     * @param {string} value
     * @returns {Promise<Article[]|undefined>}
     */
    searchArticles = async (key, value) => {
        let articleIDs = await this.searchArticleIDs(key, value);
        if (!articleIDs) return undefined;
        return Promise.all(articleIDs.map((id) => this.getArticle(id)));
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     * @param {string} id
     * @returns {Promise<Article|undefined>}
     */
    getArticle = async (id) => {
        let [article, _] = await this.getArticleMeta(id);
        if (! article) return undefined;
        article.authors = await this.getArticleAuthors(id);
        article.tags = await this.getArticleTags(id);
        return article;
    }

    /**
     * @param {string} id
     * @returns {Promise<[Article|undefined, User]>}
     */
    getArticleMeta = async (id) => {
        return new Promise((resolve) => {
            return this.db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
                if (err || row === undefined) {
                    return resolve((undefined, undefined));
                }
                return resolve([new Article(row.title, [], [], new Date(row.timestamp), row.thumbnail), row.user]);
            });
        });
    }

    /**
     * Return the array of 'Author's that are associated with the given article ID
     * @param {string} id
     * @returns {Promise<Author[]>}
     */
    // TODO: return undefined if article is nonexistent
    getArticleAuthors = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT author FROM article_authors WHERE id = ? ORDER BY author ASC', [id], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => new Author(row.author)));
            });
        });
    }

    /**
     * Return the array of all the tags that the article ID is associated with
     * @param {string} id
     * @returns {Promise<string[]>}
     */
    // TODO: return undefined if article is nonexistent
    getArticleTags = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT tag FROM article_tags WHERE id = ? ORDER BY tag ASC', [id], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.tag));
            });
        });
    }
}

module.exports = {
    ArticleDatabase,
};

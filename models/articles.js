const { Author, Article, ArticleStyle } = require("./types.js");
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
                id                  TEXT NOT NULL,
                stage               TEXT NOT NULL,
                timestamp           INT,
                title               TEXT,
                subtitle            TEXT,
                language            TEXT,
                category            TEXT,
                UNIQUE (id)
            );
            CREATE TABLE IF NOT EXISTS article_styles
            (
                id                          TEXT NOT NULL,

                hide_title_in_thumbnail     INT,
                title_font                  TEXT,
                title_fill_style            TEXT,
                title_color                 TEXT,
                title_fontsize_thumbnail    INT,
                title_fontsize_article      INT,
                title_fontweight            INT,
                title_position              TEXT,

                subtitle_font               TEXT,
                subtitle_fontsize           INT,
                subtitle_fontweight         INT,
                subtitle_color              TEXT,
                subtitle_position           TEXT,

                dropcap                     TEXT,

                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_tags
            (
                id      TEXT NOT NULL,
                tag     TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_authors
            (
                id      TEXT NOT NULL,
                author  TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_credits
            (
                id      TEXT NOT NULL,
                person  TEXT NOT NULL,
                reason  TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
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
     * Add only the gievn article's ID, stage and timestamp to the database
     * @param {Article} article
     */
    saveEmptyArticle = (article) => {
        this.db.run('INSERT INTO articles VALUES(?, ?, ?, ?, ?, ?, ?)',
            [article.id, article.stage, article.timestamp, "", "", "", ""],
            this.errorLogger
        );
    }

    /**
     * Update most of the given article's metadata (everything except ID, stage
     * and timestamp)
     * @param {Article} article
     */
    updateMetadata = (article) => {
        this.db.run('UPDATE articles SET title = ?, subtitle = ?, language = ?, category = ? WHERE id = ?',
            [article.title, article.subtitle, article.language, article.category, article.id],
            this.errorLogger
        );

        this.db.run('DELETE from article_authors WHERE id = ?', [article.id], () => {
            for (let author of article.authors) {
                this.db.run('INSERT INTO article_authors VALUES(?, ?)',
                    [article.id, author.name],
                    this.errorLogger
                );
            }
        });
        this.db.run('DELETE from article_tags WHERE id = ?', [article.id], () => {
            for (let tag of article.tags) {
                this.db.run('INSERT INTO article_tags VALUES(?, ?)',
                    [article.id, tag],
                    this.errorLogger
                );
            }
        });
    }

    /**
     * NOTE: this function supposes that you change the stage on the article
     * object, preferrably using `Article.failsafe_setStage()` as to avoid
     * invalid values
     * @param {Article} article
     */
    updateArticleStage = (article) => {
        this.db.run('UPDATE articles SET stage = ? WHERE id = ?',
            [article.stage, article.id],
            this.errorLogger
        );
    }

    /**
     * Remove previous article style and insert the new one in its place
     * @param {Article}
     * @param {ArticleStyle}
     */
    updateArticleStyles = (article, articleStyle) => {
        this.db.run('DELETE FROM article_styles WHERE id = ?', [article.id], () => {
            this.db.run('INSERT INTO article_styles VALUES (?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                [article.id, articleStyle.hide_title_in_thumbnail, articleStyle.title_font, articleStyle.title_fill_style,
                    articleStyle.title_color, articleStyle.title_fontsize_thumbnail, articleStyle.title_fontsize_article,
                    articleStyle.title_fontweight, articleStyle.title_position, articleStyle.subtitle_font,
                    articleStyle.subtitle_fontsize, articleStyle.subtitle_fontweight, articleStyle.subtitle_color,
                    articleStyle.subtitle_position, articleStyle.dropcap],
                this.errorLogger);
            }
        );
    }

    /**
     * Remove previous article style and insert the new one in its place
     * @param {string} articleID
     * @returns {Promise<ArticleStyle|undefined>}
     */
    getArticleStyle = async (articleID) => {
        return new Promise((resolve) => {
            return this.db.get('SELECT * FROM article_styles WHERE id = ?', [articleID], (err, row) => {
                if (err || row === undefined) {
                    return resolve(undefined);
                }
                return resolve(new ArticleStyle(row.hide_title_in_thumbnail,
                    row.title_font, row.title_fill_style, row.title_color,
                    row.title_fontsize_thumbnail, row.title_fontsize_article,
                    row.title_fontweight, row.title_position, row.subtitle_font,
                    row.subtitle_fontsize, row.subtitle_fontweight,
                    row.subtitle_color, row.subtitle_position, row.dropcap));
            });
        });
    }

    /**
     * Remove all entries in the database associated with the given ID
     * @param {string} id - Article ID
     */
    removeArticle = async (id) => {
        return new Promise((resolve) => {
            this.db.run('DELETE FROM articles WHERE id = ?', [id], this.errorLogger);
            this.db.run('DELETE FROM article_authors WHERE id = ?', [id], this.errorLogger);
            this.db.run('DELETE FROM article_tags WHERE id = ?', [id], this.errorLogger);
            return resolve();
        });
    }

    /**
     * Return the list of article IDs that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * @param {string|undefined} key - Valid values are
     * @param {string} value
     * @returns {Promise<string[]|undefined>}
     */
    searchArticleIDs = async (key, value, exact = true) => {
        return new Promise((resolve) => {
            let validKeyValues = ["title", "stage", "tag", "author", undefined]
            if (! validKeyValues.includes(key)) {
                return resolve(undefined);
            }

            let table = "articles";
            let orderBy = "timestamp";
            if (key == "tag") {
                table = "article_tags";
                orderBy = "tag"
            } else if (key == "author") {
                table = "article_authors";
                orderBy = "author";
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
            stmt += ` ORDER BY ${orderBy} DESC`;

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
     * `undefined` if the `key` property is not one of `["title", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * @param {string|undefined} key
     * @param {string} value
     * @returns {Promise<Article[]|undefined>}
     */
    searchArticles = async (key, value, exact = true) => {
        let articleIDs = await this.searchArticleIDs(key, value, exact);
        if (!articleIDs) return undefined;
        return Promise.all(articleIDs.map((id) => this.getArticle(id)));
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     * @param {string} id
     * @returns {Promise<Article|undefined>}
     */
    getArticle = async (id) => {
        let article = await this.getArticleMeta(id);
        if (! article) return undefined;
        article.authors = await this.getArticleAuthors(id);
        article.tags = await this.getArticleTags(id);
        //article.style = await this.getArticleStyle(id);
        return article;
    }

    /**
     * @param {string} id
     * @returns {Promise<Article|undefined>}
     */
    getArticleMeta = async (id) => {
        return new Promise((resolve) => {
            return this.db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
                if (err || (row === undefined)) {
                    return resolve(undefined);
                }
                return resolve(new Article(row.id, row.stage, new Date(row.timestamp), row.title, row.subtitle, row.language, row.category));
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

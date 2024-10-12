const { Author, Article, ArticleStyle, PDFPrint } = require("./types.js");
const { Database } = require("./database.js");
const { logger, errorLogger } = require("../logger.js");
const { ARTICLE_DATABASE_PATH } = require("../config.js");

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
     * @returns {Promise<undefined>}
     */
    init = async () => {
        return this.exec(
            `CREATE TABLE IF NOT EXISTS articles
            (
                id                  TEXT NOT NULL,
                stage               TEXT NOT NULL,
                timestamp           INT,
                title               TEXT,
                subtitle            TEXT,
                language            TEXT,
                category            TEXT,
                description         TEXT,
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
                id              TEXT NOT NULL,
                name            TEXT NOT NULL,
                credited_for    TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS pdfprints
            (
                timestamp           INT,
                description         TEXT,
                UNIQUE (description)
            );`
        )
            .then(() => logger.info(`database '${this.path}' tables: ok`))
            .catch((err) => this.errorLogger(`database '${this.path}' tables: ${err}`));
    }

    /**
     * Add only the gievn article's ID, stage and timestamp to the database
     * @param {Article} article
     */
    saveArticle = async (article) => {
        return this.run('INSERT INTO articles VALUES(?, ?, ?, ?, ?, ?, ?, ?)',
            [article.id, article.stage, article.timestamp, article.title, article.subtitle, article.language, article.category, article.description])
            .catch(this.errorLogger);
    }

    /**
     * Update most of the given article's metadata (everything except ID, stage
     * and timestamp)
     * @param {Article} article
     */
    updateMetadata = async (originalArticleID, article) => {
        return Promise.all([
            this.run('UPDATE articles SET id = ?, title = ?, subtitle = ?, language = ?, category = ?, description = ? WHERE id = ?',
                [article.id, article.title, article.subtitle, article.language, article.category, article.description, originalArticleID])
                .catch(this.errorLogger),

            this.run('DELETE from article_authors WHERE id = ?', [originalArticleID])
                .then(() => Promise.all(article.authors.map((author) => {
                    return this.run('INSERT INTO article_authors VALUES(?, ?)', [article.id, author.name]);
                })))
                .catch(this.errorLogger),

            this.run('DELETE from article_tags WHERE id = ?', [originalArticleID])
                .then(() => Promise.all(article.tags.map((tag) => {
                    return this.run('INSERT INTO article_tags VALUES(?, ?)', [article.id, tag]);
                })))
                .catch(this.errorLogger),
        ]);
    }

    /**
     * NOTE: this function supposes that you change the stage on the article
     * object, preferrably using `Article.failsafe_setStage()` as to avoid
     * invalid values
     * @param {Article} article
     */
    updateArticleStage = async (article) => {
        return this.run('UPDATE articles SET stage = ? WHERE id = ?', [article.stage, article.id])
            .catch(this.errorLogger);
    }

    /**
     * Remove previous article style and insert the new one in its place
     * @param {Article}
     * @param {ArticleStyle}
     */
    updateArticleStyles = async (originalArticleID, article, articleStyle) => {
        return this.run('DELETE FROM article_styles WHERE id = ?', [originalArticleID])
            .then(() => this.run('INSERT INTO article_styles VALUES (?, ?, ?, ?,?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    [article.id, articleStyle.hide_title_in_thumbnail, articleStyle.title_font, articleStyle.title_fill_style,
                        articleStyle.title_color, articleStyle.title_fontsize_thumbnail, articleStyle.title_fontsize_article,
                        articleStyle.title_fontweight, articleStyle.title_position, articleStyle.subtitle_font,
                        articleStyle.subtitle_fontsize, articleStyle.subtitle_fontweight, articleStyle.subtitle_color,
                        articleStyle.subtitle_position, articleStyle.dropcap]))
            .catch(this.errorLogger);
    }

    /**
     * Return the style object for the given article; note that an object with
     * undefined properties is returned if the database entry doesn't exist.
     * @param {string} articleID
     * @returns {Promise<ArticleStyle>}
     */
    getArticleStyle = async (articleID) => {
        return this.get('SELECT * FROM article_styles WHERE id = ?', [articleID])
            .then((row) => new ArticleStyle(row.hide_title_in_thumbnail,
                    row.title_font, row.title_fill_style, row.title_color,
                    row.title_fontsize_thumbnail, row.title_fontsize_article,
                    row.title_fontweight, row.title_position, row.subtitle_font,
                    row.subtitle_fontsize, row.subtitle_fontweight,
                    row.subtitle_color, row.subtitle_position, row.dropcap)
            )
            .catch((err) => {
                logger.error(err);
                return new ArticleStyle();
            })
    }

    /**
     * Remove all entries in the database associated with the given ID
     * @param {string} id - Article ID
     */
    removeArticle = async (id) => {
        return Promise.all([
            this.run('DELETE FROM articles WHERE id = ?', [id]),
            this.run('DELETE FROM article_authors WHERE id = ?', [id]),
            this.run('DELETE FROM article_tags WHERE id = ?', [id]),
            this.run('DELETE FROM article_credits WHERE id = ?', [id])
        ]).catch(this.errorLogger);
    }

    /**
     * Return the list of article IDs that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * @param {string|undefined} key
     * @param {string} value
     * @returns {Promise<string[]|undefined>}
     */
    searchArticleIDs = async (key, value, exact = true, pageNumber = 1, pageSize = -1) => {
        let validKeyValues = ["title", "stage", "tag", "author", undefined]
        if (! validKeyValues.includes(key)) {
            return Promise.resolve(undefined);
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
        if (pageSize > 0) {
            stmt += ` LIMIT ${pageSize} OFFSET ${pageNumber * pageSize}`;
        }

        return this.all(stmt, [value])
            .then((rows) => rows.map((row) => row.id))
            .catch((err) => {errorLogger(err); return []});
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
    searchArticles = async (key, value, exact = true, pageNumber = 1, pageSize = -1) => {
        let articleIDs = await this.searchArticleIDs(key, value, exact, pageNumber, pageSize);
        if (!articleIDs) return undefined;
        return Promise.all(articleIDs.map((id) => this.getArticle(id))).catch(this.errorLogger);
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     * @param {string} id
     * @returns {Article|undefined}
     */
    getArticle = async (id) => {
        let article = await this.getArticleMeta(id);
        if (! article) return undefined;
        // todo: maybe also include article style?
        let [authors, tags] = await Promise.all([
            this.getArticleAuthors(id),
            this.getArticleTags(id),
        ]);
        article.authors = authors;
        article.tags = tags;
        return article;
    }

    /**
     * @param {string} id
     * @returns {Promise<Article|undefined>}
     */
    getArticleMeta = async (id) => {
        return this.get('SELECT * FROM articles WHERE id = ?', [id])
            .then((row) => new Article(row.stage, new Date(row.timestamp), row.title, row.subtitle, row.language, row.category, row.description))
            .catch((err) => {errorLogger(err); return undefined});
    }

    /**
     * Return the array of 'Author's that are associated with the given article ID
     * @param {string} id
     * @returns {Promise<Author[]>}
     */
    // TODO: return undefined if article is nonexistent
    getArticleAuthors = async (id) => {
        return this.all('SELECT author FROM article_authors WHERE id = ? ORDER BY author ASC', [id])
            .then((rows) => rows.map((row) => new Author(row.author)))
            .catch((err) => {errorLogger(err); return []});
    }

    /**
     * Return the array of all the tags that the article ID is associated with
     * @param {string} id
     * @returns {Promise<string[]>}
     */
    // TODO: return undefined if article is nonexistent
    getArticleTags = async (id) => {
        return this.all('SELECT tag FROM article_tags WHERE id = ? ORDER BY tag ASC', [id])
            .then((rows) => rows.map((row) => row.tag))
            .catch((err) => {errorLogger(err); return []});
    }

    /**
     * Return the number of articles with the default title. This is used to
     * prevent `UNIQUE (id)` conflicts when creating new articles.
     * @returns {int}
     */
    getUntitledArticleCount = async () => {
        return (await this.searchArticles("title", "Articol fără titlu", false)).length;
    }

    /**
     * @param {PDFPrint} pdfprint
     */
    addPDFPrint = async (pdfprint) => {
        return this.run(`INSERT OR IGNORE into pdfprints VALUES (?, ?)`, [pdfprint.timestamp, pdfprint.description])
            .catch(this.errorLogger);
    }

    /**
     * @param {PDFPrint} pdfprint
     */
    removePDFPrint = async (pdfprintDescription) => {
        return this.run(`DELETE FROM pdfprints WHERE description = ?`, [pdfprintDescription])
            .catch(this.errorLogger);
    }

    /**
     * @param {Promise<[PDFPrint]>}
     */
    getAllPDFPrintsSorted = async () => {
        return this.all(`SELECT * FROM pdfprints ORDER BY timestamp DESC`)
            .then((rows) => rows.map((row) => new PDFPrint(new Date(row.timestamp), row.description)))
            .catch((err) => {this.errorLogger(err); return []});
    }

    /**
     * @param {string} articleID
     * @param {string} name
     * @param {string} credited_for
     */
    addArticleCredit = async (articleID, name, credited_for) => {
        if (name) {
            return this.run('INSERT OR REPLACE INTO article_credits VALUES (?, ?, ?)', [articleID, name, credited_for])
                .catch(this.errorLogger);
        } else {
            return Promise.resolve(undefined);
        }
    }

    /**
     * @param {string} articleID
     */
    removeAllCredits = async (articleID) => {
        return this.run('DELETE FROM article_credits WHERE id = ?', [articleID])
            .catch(this.errorLogger);
    }

    /**
     * @param {string} articleID
     * @returns {Promise<Object[]>}
     */
    getArticleCredits = async (articleID) => {
        return this.all('SELECT * FROM article_credits WHERE id = ?', [articleID])
            .then((rows) => {
                let raw = rows.map((row) => {return {name: row.name, credit: row.credited_for}});
                return {
                    editorial: raw.filter((x) => x.credit == "editorial").map((x) => x.name),
                    dtp: raw.filter((x) => x.credit == "dtp").map((x) => x.name),
                    thumbnail: raw.filter((x) => x.credit == "thumbnail").map((x) => x.name),
                }
            })
            .catch((err) => {
                this.errorLogger(err);
                return {};
            })
    }
}

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);

module.exports = {
    articleDatabase,
};

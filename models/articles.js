const { Author, Article, ArticleStyle, Magazine } = require("./types.js");
const { Database } = require("./database.js");
const { ARTICLE_DATABASE_PATH } = require("../config.js");

class ArticleDatabase extends Database {
    /**
     * Interpret the database at the given path as for article storage
     * @param {string} path
     */
    constructor(path) {
        super(path);
        this.name = "articles";
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
            CREATE TABLE IF NOT EXISTS magazines
            (
                timestamp           INT,
                description         TEXT,
                UNIQUE (description)
            );`
        )
    }

    /**
     * Add only the gievn article's ID, stage and timestamp to the database
     * @param {Article} article
     */
    saveArticle = async (article) => {
        return this.run(`INSERT INTO articles (
                id,
                stage,
                timestamp,
                title,
                subtitle,
                language,
                category,
                description
            ) VALUES (
                $id,
                $stage,
                $timestamp,
                $title,
                $subtitle,
                $language,
                $category,
                $description
            )`,
            {
                $id: article.id,
                $stage: article.stage,
                $timestamp: article.timestamp,
                $title: article.title,
                $subtitle: article.subtitle,
                $language: article.language,
                $category: article.category,
                $description: article.description,
        })
            .catch((err) => this.dbLogger.error(`saving article`, err));
    }

    /**
     * Update most of the given article's metadata (everything except ID, stage
     * and timestamp)
     * @param {Article} article
     */
    updateMetadata = async (originalArticleID, article) => {
        return Promise.all([
            this.run('UPDATE articles SET id = $id, title = $title, subtitle = $subtitle, language = $language, category = $category, description = $description WHERE id = $originalID',
                {
                    $id: article.id,
                    $title: article.title,
                    $subtitle: article.subtitle,
                    $language: article.language,
                    $category: article.category,
                    $description: article.description,
                    $originalID: originalArticleID,
            }),

            this.run('DELETE from article_authors WHERE id = ?', [originalArticleID])
                .then(() => Promise.all(article.authors.map((author) => {
                    return this.run('INSERT INTO article_authors VALUES(?, ?)', [article.id, author.name]);
                }))),

            this.run('DELETE from article_tags WHERE id = ?', [originalArticleID])
                .then(() => Promise.all(article.tags.map((tag) => {
                    return this.run('INSERT INTO article_tags VALUES(?, ?)', [article.id, tag]);
                }))),
        ])
            .catch((err) => this.dbLogger.error(`updating article metadata`, err));
    }

    /**
     * NOTE: this function supposes that you change the stage on the article
     * object, preferrably using `Article.failsafe_setStage()` as to avoid
     * invalid values
     * @param {Article} article
     */
    updateArticleStage = async (article) => {
        return this.run('UPDATE articles SET stage = ? WHERE id = ?', [article.stage, article.id])
            .catch((err) => this.dbLogger.error(`updating article stage`, err));
    }

    /**
     * Remove previous article style and insert the new one in its place
     * @param {Article}
     * @param {ArticleStyle}
     */
    updateArticleStyles = async (originalArticleID, article, articleStyle) => {
        return this.run('DELETE FROM article_styles WHERE id = ?', [originalArticleID])
            /* This INSERT statement is pure madness. */
            .then(() => this.run(`INSERT INTO article_styles (
                    id,
                    hide_title_in_thumbnail,
                    title_font,
                    title_fill_style,
                    title_color,
                    title_fontsize_thumbnail,
                    title_fontsize_article,
                    title_fontweight,
                    title_position,
                    subtitle_font,
                    subtitle_fontsize,
                    subtitle_fontweight,
                    subtitle_color,
                    subtitle_position,
                    dropcap
                )
                VALUES (
                    $id,
                    $hide_title_in_thumbnail,
                    $title_font,
                    $title_fill_style,
                    $title_color,
                    $title_fontsize_thumbnail,
                    $title_fontsize_article,
                    $title_fontweight,
                    $title_position,
                    $subtitle_font,
                    $subtitle_fontsize,
                    $subtitle_fontweight,
                    $subtitle_color,
                    $subtitle_position,
                    $dropcap
                )`, {
                    $id: article.id,
                    $hide_title_in_thumbnail: articleStyle.hide_title_in_thumbnail,
                    $title_font: articleStyle.title_font,
                    $title_fill_style: articleStyle.title_fill_style,
                    $title_color: articleStyle.title_color,
                    $title_fontsize_thumbnail: articleStyle.title_fontsize_thumbnail,
                    $title_fontsize_article: articleStyle.title_fontsize_article,
                    $title_fontweight: articleStyle.title_fontweight,
                    $title_position: articleStyle.title_position,
                    $subtitle_font: articleStyle.subtitle_font,
                    $subtitle_fontsize: articleStyle.subtitle_fontsize,
                    $subtitle_fontweight: articleStyle.subtitle_fontweight,
                    $subtitle_color: articleStyle.subtitle_color,
                    $subtitle_position: articleStyle.subtitle_position,
                    $dropcap: articleStyle.dropcap,
                }
            ))
            .catch((err) => this.dbLogger.error(`updating article styles`, err));
    }

    /**
     * Return the style object for the given article; note that an object with
     * undefined properties is returned if the database entry doesn't exist.
     * @param {string} articleID
     * @returns {Promise<ArticleStyle>}
     */
    getArticleStyle = async (articleID) => {
        return this.get('SELECT * FROM article_styles WHERE id = ?', [articleID])
            .then((row) => new ArticleStyle({
                hide_title_in_thumbnail: row.hide_title_in_thumbnail,
                title_font: row.title_font,
                title_fill_style: row.title_fill_style,
                title_color: row.title_color,
                title_fontsize_thumbnail: row.title_fontsize_thumbnail,
                title_fontsize_article: row.title_fontsize_article,
                title_fontweight: row.title_fontweight,
                title_position: row.title_position,
                subtitle_font: row.subtitle_font,
                subtitle_fontsize: row.subtitle_fontsize,
                subtitle_fontweight: row.subtitle_fontweight,
                subtitle_color: row.subtitle_color,
                subtitle_position: row.subtitle_position,
                dropcap: row.dropcap
            }))
            .catch((err) => {
                this.dbLogger.error(`getting article style`, err);
                return new ArticleStyle({});
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
        ]).catch((err) => this.dbLogger.error(`removing article from the database`, err));
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
            .catch((err) => {this.dbLogger.error(`searching article IDs`, err); return []});
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
        return Promise.all(articleIDs.map((id) => this.getArticle(id)))
            .catch((err) => this.dbLogger.error(`searching articles`, err));
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     * @param {string} id
     * @returns {Promise<Article>}
     */
    getArticle = async (id) => {
        return this.getArticleMeta(id)
            .then((article) => Promise.all([
                Promise.resolve(article),
                this.getArticleAuthors(id),
                this.getArticleTags(id),
            ]))
            .then(([article, authors, tags]) => {
                if (article != undefined) {
                    article.authors = authors;
                    article.tags = tags;
                }
                return article;
            })
            .catch((err) => this.dbLogger.error(`getting article`, err));
    }

    /**
     * @param {string} id
     * @returns {Promise<Article|undefined>}
     */
    getArticleMeta = async (id) => {
        return this.get('SELECT * FROM articles WHERE id = ?', [id])
            .then((row) => new Article({
                stage: row.stage,
                timestamp: new Date(row.timestamp),
                title: row.title,
                subtitle: row.subtitle,
                language: row.language,
                category: row.category,
                description: row.description
            }))
            .catch((err) => {this.dbLogger.error(`getting article meta`, err); return undefined});
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
            .catch((err) => {this.dbLogger.error(`getting article authors`, err); return []});
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
            .catch((err) => {this.dbLogger.error(`getting article tags`, err); return []});
    }

    /**
     * Return the number of articles with the default title. This is used to
     * prevent `UNIQUE (id)` conflicts when creating new articles.
     * @returns {int}
     */
    getUntitledArticleCount = async () => {
        return (await this.searchArticleIDs("title", "Articol fără titlu", false)).length;
    }

    /**
     * @param {Magazine} magazine
     */
    addMagazine = async (magazine) => {
        return this.run(`INSERT OR IGNORE into magazines VALUES (?, ?)`, [magazine.timestamp, magazine.description])
            .catch((err) => this.dbLogger.error(`adding magazine`, err));
    }

    /**
     * @param {Magazine} magazine
     */
    removeMagazine = async (magazineDescription) => {
        return this.run(`DELETE FROM magazines WHERE description = ?`, [magazineDescription])
            .catch((err) => this.dbLogger.error(`removing magazine`, err));
    }

    /**
     * @param {Promise<[Magazine]>}
     */
    getAllMagazinesSorted = async () => {
        return this.all(`SELECT * FROM magazines ORDER BY timestamp DESC`)
            .then((rows) => rows.map((row) => new Magazine(new Date(row.timestamp), row.description)))
            .catch((err) => {this.dbLogger.error(`getting magazines`, err); return []});
    }

    /**
     * @param {string} articleID
     * @param {string} name
     * @param {string} credited_for
     */
    addArticleCredit = async (articleID, name, credited_for) => {
        if (name) {
            return this.run('INSERT OR REPLACE INTO article_credits VALUES (?, ?, ?)', [articleID, name, credited_for])
                .catch((err) => this.dbLogger.error(`adding article credits`, err));
        } else {
            return Promise.resolve(undefined);
        }
    }

    /**
     * @param {string} articleID
     */
    removeAllCredits = async (articleID) => {
        return this.run('DELETE FROM article_credits WHERE id = ?', [articleID])
            .catch((err) => this.dbLogger.error(`removing article credits`, err));
    }

    /**
     * @param {string} articleID
     * @returns {Promise<Object>}
     */
    getArticleCredits = async (articleID) => {
        return this.all('SELECT * FROM article_credits WHERE id = ? ORDER BY name', [articleID])
            .then((rows) => {
                let raw = rows.map((row) => {return {name: row.name, credit: row.credited_for}});
                return {
                    editorial: raw.filter((x) => x.credit == "editorial").map((x) => x.name),
                    dtp: raw.filter((x) => x.credit == "dtp").map((x) => x.name),
                    thumbnail: raw.filter((x) => x.credit == "thumbnail").map((x) => x.name),
                }
            })
            .catch((err) => {
                this.dbLogger.error(`getting article credits`, err);
                return {};
            })
    }
}

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);

module.exports = {
    articleDatabase,
};

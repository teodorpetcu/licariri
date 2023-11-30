const { Author, Article } = require("./types.js");
const { Database } = require("./database.js");

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
                author_occupation   TEXT,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
        `, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`database '${this.path}' tables: ok`);
            }
        });
    }

    /**
     * Save an article's metadata to a database
     * @param {Article} article
     * @param {string} user_id
     */
    // TODO: handle errors via callbacks on the 'exec' statements
    save_article = (article, user_id) => {
        this.db.run('INSERT INTO articles VALUES(?, ?, ?, ?, ?)',
            [article.id, user_id, article.title, article.timestamp, article.thumbnail ? article.thumbnail : ""]);
        for (let tag of article.tags) {
            this.db.run('INSERT INTO article_tags VALUES(?, ?)',
                [article.id, tag]);
        }
        for (let author of article.authors) {
            this.db.run('INSERT INTO article_authors VALUES(?, ?, ?)',
                [article.id, author.name, author.occupation]);
        }
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     * @param {string} id
     * @returns {Promise<Article>}
     */
    // TODO: return undefined if article is nonexistent
    search_article = async (id) => {
        let [title, timestamp, thumbnail] = await this.get_article_meta(id);
        let authors = await this.get_article_authors(id);
        let tags = await this.get_article_tags(id);
        return new Article(title, authors, tags, timestamp, thumbnail);
    }

    /**
     * Get a slice of the most recent articles, from 'start' to 'end'
     * @param {integer} start - beginning of the slice (0-indexed)
     * @param {integer} end - end of the slice (0-indexed)
     * @returns {Promise<Article[]>}
     */
    // TODO: log error if there is one
    get_recent_articles = async (start, end) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT id FROM articles ORDER BY timestamp DESC', (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                rows = rows.slice(start, end);
                return Promise.all(rows.map((row) => this.search_article(row.id)))
                    .then((values) => resolve(values));
            });
        });
    }

    /**
     * Return all the articles belonging to the specified user, sorted by
     * timestamp
     * @param {string} user_id
     */
    search_articles_by_publisher = async (user_id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT id FROM articles WHERE user = ? ORDER BY timestamp DESC', [user_id], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return Promise.all(rows.map((row) => this.search_article(row.id)))
                    .then((values) => resolve(values));
            });
        })

    }

    /**
     * Return an array: the first element is the title of the title associated
     * with the given ID, and the second is the date this article was created.
     * If there is no article with this ID, then both elements are empty.
     * @param {string} id
     * @returns {Promise<[string, string|undefined, string]>}
     */
    // TODO: return undefined if article is nonexistent
    get_article_meta = async (id) => {
        return new Promise((resolve, _) => {
            return this.db.get('SELECT * FROM articles WHERE id = ?', [id], (err, row) => {
                if (err || row === undefined) {
                    return resolve(["", undefined]);
                }
                return resolve([row.title, new Date(row.timestamp), row.thumbnail])
            });
        })
    }

    /**
     * Return the array of 'Author's that are associated with the given article ID
     * @param {string} id
     * @returns {Promise<Author[]>}
     */
    // TODO: return undefined if article is nonexistent
    get_article_authors = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT author FROM article_authors WHERE id = ? ORDER BY author ASC', [id], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => new Author(row.author, row.author_occupation)));
            });
        })
    }

    /**
     * Return the array of all the tags that the article ID is associated with
     * @param {string} id
     * @returns {Promise<string[]>}
     */
    // TODO: return undefined if article is nonexistent
    get_article_tags = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT tag FROM article_tags WHERE id = ? ORDER BY tag ASC', [id], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.tag));
            });
        })
    }

    /**
     * Return the array of article IDs that the given author wrote
     * @param {string} author - Name of the author
     * @returns {Promise<string[]>}
     */
    search_articles_by_author = async (author) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT id FROM article_authors WHERE author = ?', [author], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.id));
            });
        });
    }

    /**
     * Return the array of article IDs that have the given tag
     * @param {string} tag
     * @returns {Promise<string[]>}
     */
    search_articles_by_tag = async (tag) => {
        return new Promise((resolve, _) => {
            this.db.all('SELECT id FROM article_tags WHERE tag = ?', [tag], (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.id));
            });
        });
    }
}

module.exports = {
    ArticleDatabase,
};

const sqlite3 = require("sqlite3");

class Author {
    constructor(name, occupation) {
        this.name = name;
        this.occupation = occupation;
    }
}

class Article {
    constructor(title, date, authors, tags) {
        this.title = title;
        this.date = date;
        this.authors = authors;
        this.tags = tags;
        this.id = this.article_id();
    }

    article_id() {
        return this.date + "-" + this.title.toLowerCase().replace(/[ \t\n]/g, "-");
    }
}

class ArticleDatabase {
    constructor(path) {
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                console.error(err)
            }
        })
    }

    init = () => {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS articles
            (
                id          TEXT NOT NULL,
                title       TEXT NOT NULL,
                date        TEXT,
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
        `);
        console.log("Database initialised successfully")
    }

    save_article = (article) => {
        this.db.exec(`
            INSERT INTO articles VALUES('${article.id}', '${article.title}', '${article.date}');
        `);
        for (let tag of article.tags) {
            this.exec(`
                INSERT INTO article_tags VALUES('${article.id}', '${tag}');
            `);
        }
        for (let author of article.authors) {
            this.db.exec(`
                INSERT INTO article_authors VALUES('${article.id}', '${author.name}', '${author.occupation}');
            `);
        }
    }

    search_article = async (id) => {
        let [title, date] = await this.get_article_meta(id);
        let authors = await this.get_article_authors(id);
        let tags = await this.get_article_tags(id);
        return new Article(title, date, authors, tags);
    }

    get_recent_articles = async (start, end) => {
        return new Promise((resolve, _) => {
            this.db.all(`SELECT * FROM articles ORDER BY date DESC`, (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                rows = rows.slice(start, end);
                return Promise.all(rows.map((row) => this.search_article(row.id)))
                    .then((values) => resolve(values));
            });
        })
    }

    get_article_meta = async (id) => {
        return new Promise((resolve, _) => {
            return this.db.get(`SELECT * FROM articles WHERE id = '${id}'`, (err, row) => {
                if (err || row === undefined) {
                    return resolve(["", ""]);
                }
                return resolve([row.title, row.date])
            });
        })
    }

    get_article_authors = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all(`SELECT * FROM article_authors WHERE id = '${id}'`, (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => new Author(row.author, row.author_occupation)));
            });
        })
    }

    get_article_tags = async (id) => {
        return new Promise((resolve, _) => {
            this.db.all(`SELECT * FROM article_tags WHERE id = '${id}'`, (err, rows) => {
                if (err || rows === undefined) {
                    return resolve([]);
                }
                return resolve(rows.map((row) => row.tag));
            });
        })
    }
}

exports.ArticleDatabase = ArticleDatabase;

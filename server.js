const express = require("express");
const marked = require("marked");
const sqlite3 = require("sqlite3");
const fs = require("fs");

const app = express();
const port = 8000;

const db_path = __dirname + "/articles/articles.sql"

const db = new sqlite3.Database(db_path, (err) => {
    if (err) {
        console.error(err);
    }
})

const init_db = () => {
    db.exec(`
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
}

init_db();
console.log("Database initialised successfully")

const db_get_article_meta = async (id) => {
    return new Promise((resolve, _) => {
        return db.get(`SELECT * FROM articles WHERE id = '${id}'`, (err, row) => {
            if (err || row === undefined) {
                return resolve(["", ""]);
            }
            return resolve([row.title, row.date])
        });
    })
}

const db_get_article_authors = async (id) => {
    return new Promise((resolve, _) => {
        db.all(`SELECT * FROM article_authors WHERE id = '${id}'`, (err, rows) => {
            if (err || rows === undefined) {
                return resolve([]);
            }
            return resolve(rows.map((row) => new Author(row.author, row.author_occupation)));
        });
    })
}

const db_get_article_tags = async (id) => {
    return new Promise((resolve, _) => {
        db.all(`SELECT * FROM article_tags WHERE id = '${id}'`, (err, rows) => {
            if (err || rows === undefined) {
                return resolve([]);
            }
            return resolve(rows.map((row) => row.tag));
        });
    })
}

const search_db = async (id) => {
    let [title, date] = await db_get_article_meta(id);
    let authors = await db_get_article_authors(id);
    let tags = await db_get_article_tags(id);
    return new Article(title, date, authors, tags);
}

const db_get_recent_articles = async (start, end) => {
    return new Promise((resolve, _) => {
        db.all(`SELECT * FROM articles ORDER BY date DESC`, (err, rows) => {
            if (err || rows === undefined) {
                return resolve([]);
            }
            rows = rows.slice(start, end);
            return Promise.all(rows.map((row) => search_db(row.id))).then((values) => resolve(values));
        });
    })
}

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

    save_metadata() {
        db.exec(`
            INSERT INTO articles VALUES('${this.id}', '${this.title}', '${this.date}');
        `);
        for (let tag of this.tags) {
            db.exec(`
                INSERT INTO article_tags VALUES('${this.id}', '${tag}');
            `);
        }
        for (let author of this.authors) {
            db.exec(`
                INSERT INTO article_authors VALUES('${this.id}', '${author.name}', '${author.occupation}');
            `);
        }
    }
}

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"))

app.get("/", async (req, res) => {
    let page = req.query.page ? req.query.page : 1;
    let page_size = 9;
    let article_page = await db_get_recent_articles(page_size * (page - 1), page_size * (page));
    res.render("main", {article_page})
})

app.get("/query", (_req, res) => {
    res.redirect("/");
})

app.get("/publish", (_, res) => {
    res.redirect("/");
})

app.post("/publish", (_req, res) => {
    res.redirect("/");
})

app.get("/:article_id", async (req, res) => {
    const article_id = req.params.article_id;
    const article = await search_db(article_id);
    const markdown = `./articles/${article_id}.md`
    fs.readFile(markdown, "utf8", (err, data) => {
        if (err) {
            res.send("File not found")
        } else {
            article.contents = marked.parse(data.toString());
            res.render("article", {article});
        }
    })
})

app.listen(port, () => {
    console.log(`Web server up (http://localhost:${port})`)
})

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

app.set("view engine", "ejs");

app.use(express.static(__dirname + "/public"))

app.get("/", (_, res) => {
    res.render("main", {})
})

app.get("/query", (_req, res) => {
    res.render("main", {})
})

app.get("/publish", (_, res) => {
    res.render("main", {})
})

app.post("/publish", (_req, res) => {

    res.render("main", {})
})

app.listen(port, () => {
    console.log(`Web server up (http://localhost:${port})`)
})

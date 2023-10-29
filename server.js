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

const express = require("express");
const marked = require("marked");
const fs = require("fs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const crypto = require("crypto");

const {ArticleDatabase} = require("./articles.js");
const {UsersDatabase} = require("./admin.js");

const articleDatabase = new ArticleDatabase(__dirname + "/articles/articles.sql");
articleDatabase.init();

const usersDatabase = new UsersDatabase(__dirname + "/articles/users.sql");
usersDatabase.init();

const app = express();
const port = 8000;

const MAIN_PAGE_ARTICLE_COUNT = 9;

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: false, }));

app.use(cookieParser());

app.use(express.static(__dirname + "/public"))

app.get("/", async (req, res) => {
    let page = req.query.page ? req.query.page : 1;
    let article_page = await articleDatabase.get_recent_articles(
        MAIN_PAGE_ARTICLE_COUNT * (page - 1),
        MAIN_PAGE_ARTICLE_COUNT * (page)
    );
    res.render("main", {article_page})
})

app.get("/query", (_req, res) => {
    res.redirect("/");
})

app.get("/publish", (_, res) => {
    res.redirect("/");
})

const sessions = [];

app.get("/admin", async (req, res) => {
    let sessionCookie = req.cookies.session;
    if (sessions[sessionCookie]) {
        res.send("Authorized");
    } else {
        res.render("login", {});
    }
})

// TODO: rate limit
app.post("/admin", async (req, res) => {
    const id = req.body.id;
    const pass = req.body.password;
    if (await usersDatabase.is_correct_login_combo(id, pass)) {
        const sessionID = crypto.randomBytes(64).toString("hex");
        sessions[sessionID] = id;
        res.cookie("session", sessionID, {httpOnly: true, secure: true, sameSite: "strict"});
        res.status(200);
    }
    res.redirect("/admin");
})

// TODO: move articles to the `/articles` route
app.get("/:article_id", async (req, res) => {
    const article_id = req.params.article_id;
    const article = await articleDatabase.search_article(article_id);
    const markdown = `./articles/${article_id}.md`
    fs.readFile(markdown, "utf8", (err, data) => {
        if (err) {
            // TODO: make a 404 page
            article.contents = "";
            res.render("article", {article});
        } else {
            article.contents = marked.parse(data.toString());
            res.render("article", {article});
        }
    })
})

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(port, () => {
    console.log(`Web server up (http://localhost:${port})`);
})

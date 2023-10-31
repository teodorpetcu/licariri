const express = require("express");
const marked = require("marked");
const fs = require("fs");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const {ArticleDatabase, Article, Author} = require("./articles.js");
const {UsersDatabase, Session} = require("./admin.js");

const articleDatabase = new ArticleDatabase(__dirname + "/articles/articles.sql");
articleDatabase.init();

const usersDatabase = new UsersDatabase(__dirname + "/articles/users.sql");
usersDatabase.init();

const app = express();
const port = 8000;

const MAIN_PAGE_ARTICLE_COUNT = 9;

const COOKIE_OPTIONS = {httpOnly: true, secure: true, sameSite: "strict"};

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true, }));

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

/**
 * Determine whether the request belongs to an authorised user
 * @returns {Promise<boolean>}
 */
const isLoggedIn = async (req) => {
    let sessionCookie = req.cookies.session;
    return usersDatabase.has_session(sessionCookie);
}

/**
 * Middleware; send status code 401 if the request doesn't belong to an
 * authorised user
 */
const forbidUnauthorised = async (req, res, next) => {
    if (!await isLoggedIn(req)) {
        res.status(401).send();
    } else {
        next();
    }
}

app.get("/admin", async (req, res) => {
    if (await isLoggedIn(req)) {
        res.redirect("/admin/add")
    } else {
        res.render("login", {});
    }
})

// TODO: limit the amount of login attempts
app.post("/admin", async (req, res) => {
    const id = req.body.id;
    const pass = req.body.password;
    if (await usersDatabase.is_correct_login_combo(id, pass)) {
        const session = new Session(id);
        usersDatabase.add_session(session);
        res.cookie("session", session.token, COOKIE_OPTIONS);
    }
    res.redirect("/admin");
})

app.get("/admin/add", forbidUnauthorised, async (_, res) => {
    res.render("add-article", {});
})

app.post("/admin/add", forbidUnauthorised, async (req, res) => {
    const title = req.body.title;
    const authors = req.body.authors
                    ? req.body.authors.map((a) => new Author(a))
                    : [];
    const tags = req.body.tags
                    ? req.body.tags
                    : [];
    const content = req.body.content;

    const article = new Article(title, authors, tags);

    fs.writeFileSync(__dirname + `/articles/${article.id}.md`, content);
    articleDatabase.save_article(article);

    res.redirect(`/${article.id}`);
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

const {
    COOKIE_OPTIONS,
    USER_PRIVILEGES,
    ARTICLES_DIRECTORY,
} = require("../config.js");
const { usersDatabase, User, Session } = require("../models/admin.js");
const { articleDatabase } = require("../models/articles.js");
const { Article } = require("../models/types.js");

const fs = require("fs");

const MILISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Middleware: look at the cookies on the request and attach user information to
 * `req.user`, if the session token is valid, or `undefined`, if invalid.
 */
const identifyAuthorisedUser = async (req, _, next) => {
    let sessionCookie = req.cookies.session;
    req.user = await usersDatabase.getSessionUser(sessionCookie);
    next();
}

/**
 * Security through obscurity: send a 404 error if the user is unauthorized to
 * do something.
 *
 * Must be used in conjunction with `identifyAuthorisedUser`
 */
const forbidUnauthorised = async (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.status(404).render("404");
    }
}

const get_adminPannelPage = async (req, res) => {
    if (req.user) {
        let articles = await articleDatabase.searchArticles();
        res.render("admin", {articles, user: req.user, canManageUsers: req.user.privilege == USER_PRIVILEGES["SUPERUSER"]});
    } else {
        res.render("login", {});
    }
}

const post_adminLoginCheck = async (req, res) => {
    const id = req.body.username;
    const pass = req.body.password;
    const rememberMe = req.body.remember_me;
    let cookieOptions = COOKIE_OPTIONS;
    if (await usersDatabase.isCorrectLoginCombo(id, pass)) {
        const session = new Session(id);
        usersDatabase.addSession(session);
        if (rememberMe == "on") {
            cookieOptions.maxAge = 28 * MILISECONDS_IN_A_DAY; // 4 weeks
        }
        res.cookie("session", session.token, cookieOptions);
    }
    res.redirect("/admin");
}

const post_adminLogout = async(req, res) => {
    usersDatabase.removeSession(req.cookies.session);
    res.redirect("/admin")
}

const get_adminAddArticle = async (req, res) => {
    let article = await articleDatabase.getArticle(req.params.articleID);
    if (article) {
        article.style = await articleDatabase.getArticleStyle(article.id);
        let contentsPath = `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`;
        if (fs.existsSync(contentsPath)) {
            article.content = fs.readFileSync(contentsPath, {encoding: "utf-8"});
        }
    } else {
        article = new Article(stage="draft", timestamp=undefined,
            title=`Articol fără titlu (${await articleDatabase.getUntitledArticleCount() + 1})`);
        article.style = {};
        articleDatabase.saveEmptyArticle(article);
    }
    res.render("edit-article-contents", {defaults: article});
}

const get_adminAddUserPage = async (req, res) => {
    if (req.user.privilege < USER_PRIVILEGES["SUPERUSER"]) {
        res.sendStatus(401);
    } else {
        res.render("add-user", {});
    }
}

const post_adminAddUser = async (req, res) => {
    if (req.user.privilege < USER_PRIVILEGES["SUPERUSER"]) {
        res.sendStatus(401);
    } else {
        let privilege = USER_PRIVILEGES[req.body.privilege];
        let user = new User(req.body.id, req.body.name, privilege);
        await usersDatabase.addUser(user, req.body.password);
        await usersDatabase.addActivity(req.user, "adduser", user.id); // NOTE: req.user =/= user
        res.sendStatus(200);
    }
}

const get_adminChangeUserPassword = async (_, res) => {
    res.render("change-password");
}

const post_adminChangeUserPassword = async (req, res) => {
    if (await usersDatabase.isCorrectLoginCombo(req.user.id, req.body.original)) {
        await usersDatabase.changePassword(req.user, req.body.password);
        await usersDatabase.addActivity(req.user, "changepassword", "self");
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
}

module.exports = {
    identifyAuthorisedUser,
    forbidUnauthorised,
    get_adminPannelPage,
    get_adminAddArticle,
    post_adminLoginCheck,
    post_adminLogout,
    get_adminAddUserPage,
    post_adminAddUser,
    get_adminChangeUserPassword,
    post_adminChangeUserPassword,
}

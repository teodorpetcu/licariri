const { USERS_DATABASE_PATH, ARTICLE_DATABASE_PATH, COOKIE_OPTIONS, USER_PRIVILEGES } = require("../config.js");
const { UsersDatabase, User, Session } = require("../models/admin.js");
const { ArticleDatabase } = require("../models/articles.js");

const usersDatabase = new UsersDatabase(USERS_DATABASE_PATH);
usersDatabase.init();

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);
articleDatabase.init();

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
 * Middleware: return 401 to all requests that have no (valid) session token
 *
 * On requests that are authorised, attach `user` to the `req` object.
 *
 * Must be used in conjunction with `identifyAuthorisedUser`
 */
const forbidUnauthorised = async (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
}

const get_adminPannelPage = async (req, res) => {
    if (req.user) {
        let articles = await articleDatabase.searchArticles("user", req.user.id);
        res.render("admin", {articles, canManageUsers: req.user.privilege == USER_PRIVILEGES["SUPERUSER"]});
    } else {
        res.render("login", {});
    }
}

const post_adminLoginCheck = async (req, res) => {
    const id = req.body.id;
    const pass = req.body.password;
    if (await usersDatabase.isCorrectLoginCombo(id, pass)) {
        const session = new Session(id);
        usersDatabase.addSession(session);
        res.cookie("session", session.token, COOKIE_OPTIONS);
    }
    res.redirect("/admin");
}

const get_adminAddArticle = async (_, res) => {
    let emptyArticle = {
        title: "",
        authors: [],
        tags: [],
        content: "",
    }
    res.render("add-or-modify-article", {action: "add", defaults: emptyArticle});
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
        res.sendStatus(200);
    }
}

const get_adminChangeUserPassword = async (_, res) => {
    res.render("change-password");
}

const post_adminChangeUserPassword = async (req, res) => {
    if (await usersDatabase.isCorrectLoginCombo(req.user.id, req.body.original)) {
        await usersDatabase.changePassword(req.user, req.body.password);
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
    get_adminAddUserPage,
    post_adminAddUser,
    get_adminChangeUserPassword,
    post_adminChangeUserPassword,
}

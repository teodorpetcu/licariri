const { USERS_DATABASE_PATH, COOKIE_OPTIONS, USER_PRIVILEGES } = require("../config.js");
const { UsersDatabase, User, Session } = require("../models/admin.js");

const usersDatabase = new UsersDatabase(USERS_DATABASE_PATH);
usersDatabase.init();

/**
 * Middleware: look at the cookies on the request and attach user information to
 * `req.user`, if the session token is valid, or `undefined`, if invalid.
 */
const identifyAuthorizedUser = async (req, _, next) => {
    let sessionCookie = req.cookies.session;
    req.user = await usersDatabase.get_session_user(sessionCookie);
    next();
}

/**
 * Middleware: return 401 to all requests that have no (valid) session token
 *
 * On requests that are authorised, attach `user` to the `req` object.
 *
 * Must be used in conjunction with `identifyAuthorizedUser`
 */
const forbidUnauthorised = async (req, res, next) => {
    if (req.user) {
        next();
    } else {
        res.sendStatus(401);
    }
}

const get_adminPageView = async (req, res) => {
    if (req.user) {
        res.render("admin", {user_management: req.user.privilege == USER_PRIVILEGES["SUPERUSER"]});
    } else {
        res.render("login", {});
    }
}

const post_adminLoginCheck = async (req, res) => {
    const id = req.body.id;
    const pass = req.body.password;
    if (await usersDatabase.is_correct_login_combo(id, pass)) {
        const session = new Session(id);
        usersDatabase.add_session(session);
        res.cookie("session", session.token, COOKIE_OPTIONS);
    }
    res.redirect("/admin");
}

const get_adminAddArticlePage = async (_, res) => {
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
        await usersDatabase.add_user(user, req.body.password);
        res.sendStatus(200);
    }
}

const get_adminChangeUserPassword = async (_, res) => {
    res.render("change-password");
}

const post_adminChangeUserPassword = async (req, res) => {
    if (await usersDatabase.is_correct_login_combo(req.user.id, req.body.original)) {
        await usersDatabase.change_password(req.user, req.body.password);
        res.sendStatus(200);
    } else {
        res.sendStatus(401);
    }
}

module.exports = {
    identifyAuthorizedUser,
    forbidUnauthorised,
    get_adminPageView,
    get_adminAddArticlePage,
    post_adminLoginCheck,
    get_adminAddUserPage,
    post_adminAddUser,
    get_adminChangeUserPassword,
    post_adminChangeUserPassword,
}

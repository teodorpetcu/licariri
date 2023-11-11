const { USERS_DATABASE_PATH, COOKIE_OPTIONS } = require("../config.js");
const { UsersDatabase, Session } = require("../models/admin.js");

const usersDatabase = new UsersDatabase(USERS_DATABASE_PATH);
usersDatabase.init();

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

const get_adminPageView = async (req, res) => {
    if (await isLoggedIn(req)) {
        res.render("admin", {});
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
    res.render("add-article", {});
}

module.exports = {
    forbidUnauthorised,
    get_adminPageView,
    get_adminAddArticlePage,
    post_adminLoginCheck,
}

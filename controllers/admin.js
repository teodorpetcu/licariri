const { USERS_DATABASE_PATH, COOKIE_OPTIONS } = require("../config.js");
const { UsersDatabase, Session } = require("../models/admin.js");

const usersDatabase = new UsersDatabase(USERS_DATABASE_PATH);
usersDatabase.init();

/**
 * Return the user ID of the session that the coookie points to, or undefined if
 * there is none
 * @returns {Promise<string|undefined>}
 */
const getUserSession = async (req) => {
    let sessionCookie = req.cookies.session;
    return usersDatabase.get_session(sessionCookie);
}

/**
 * Middleware: return 401 to all requests that have no (valid) session token
 *
 * On requests that are authorised, attach `user.id` to the `req` object.
 */
const forbidUnauthorised = async (req, res, next) => {
    let user_id = await getUserSession(req);
    if (!user_id) {
        res.status(401).send();
    } else {
        req.user = {id: user_id};
        next();
    }
}

const get_adminPageView = async (req, res) => {
    if (await getUserSession(req)) {
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

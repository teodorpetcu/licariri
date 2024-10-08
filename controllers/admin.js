const {
    COOKIE_OPTIONS,
    USER_PRIVILEGES,
    ARTICLES_DIRECTORY,
} = require("../config.js");
const { usersDatabase, User, Session } = require("../models/admin.js");
const { articleDatabase } = require("../models/articles.js");
const { Article } = require("../models/types.js");
const { logger } = require("../logger.js");

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
        if (req.user.suspended) {
            res.status(401).send("Ne pare rău, contul tău a fost suspendat.");
            usersDatabase.removeSession(req.cookies.session);
        } else {
            next();
        }
    } else {
        res.status(404).render("404");
    }
}

/**
 * Even if login cookies expire after 28 days, they'd also need to be
 * deleted from the database, to minimise the risk of an expired login token
 * being reused.
 *
 * The most convenient solution is to prune the database every 24 hours, at
 * midnight.
 */
const removeOldSessionsFromDatabase = async () => {
    let sessions = await usersDatabase.getAllSessions();
    let today = new Date();
    let numberRemoved = 0;
    for (let session of sessions) {
        let timestamp = new Date(session.timestamp);
        let daysDifference = Math.floor((today - timestamp) / MILISECONDS_IN_A_DAY);
        if (daysDifference > 28) {
            await usersDatabase.removeSession(session.token);
            numberRemoved += 1;
        }
    }
    logger.info(`removed ${numberRemoved} user session(s) from the database older than 28 days`);
}

let milisecondsToNextMidnight = new Date();
milisecondsToNextMidnight.setHours(24, 0, 0, 0);
milisecondsToNextMidnight = milisecondsToNextMidnight.getTime() - Date.now();
setTimeout(() => {
    removeOldSessionsFromDatabase();
    setInterval(removeOldSessionsFromDatabase, MILISECONDS_IN_A_DAY)
}, milisecondsToNextMidnight)

/**
 * Split the given array into multiple arrays of length equal to `pageSize`; if
 * the array's length isn't divisible by `pageSize`, then the last array
 * contains all the remainder elements.
 * @param {arr[]} arr
 * @param {int} pageSize
 * @returns {arr[]}
 */
const paginate = (arr, pageSize) => {
    return Array.from({ length: Math.ceil(arr.length / pageSize) }, (_, i) =>
        arr.slice(i * pageSize, i * pageSize + pageSize)
    )
}

const get_adminLoginPage = async (req, res) => {
    if (req.user) {
        res.redirect("/admin");
    } else {
        res.render("login", {});
    }
}

const get_adminPannelPage = async (req, res) => {
    if (req.user) {
        let usersPages = []
        if (req.user.privilege >= USER_PRIVILEGES["SUPERUSER"]) {
            usersPages = paginate(await usersDatabase.getAllUsers(), 12);
        }
        let draftArticlesPages = paginate(await articleDatabase.searchArticles("stage", "draft"), 12);
        let publicArticlesPages = paginate(await articleDatabase.searchArticles("stage", "public"), 12);
        let trashArticlesPages = paginate(await articleDatabase.searchArticles("stage", "trash"), 12);
        let pdfprints = paginate(await articleDatabase.getAllPDFPrintsSorted(), 12);
        res.render("admin", {publicArticlesPages, draftArticlesPages, trashArticlesPages, pdfprints, user: req.user, usersPages});
    } else {
        res.redirect("login", {});
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

const post_adminAddUser = async (req, res) => {
    if (req.user.privilege < USER_PRIVILEGES["SUPERUSER"]) {
        res.sendStatus(401);
    } else {
        let privilege = USER_PRIVILEGES[req.body.privilege];
        let user = new User(req.body.id, privilege);
        await usersDatabase.addUser(user, req.body.password);
        await usersDatabase.addActivity(req.user, "adduser", user.id); // NOTE: req.user =/= user
        res.sendStatus(200);
    }
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

const post_adminSuspendUser = async (req, res) => {
    let userID = req.body.id;
    let suspend = req.body.suspend;
    // TODO: check server-side if the user requesting suspension's privilege is
    // less than or equal to the user to be suspended, and abort if that's the
    // case
    if (req.user.privilege < USER_PRIVILEGES["SUPERUSER"]) {
        res.status(404).render("404");
    } else {
        if (suspend == 1) {
            await usersDatabase.addActivity(req.user, "suspendUser", userID);
            usersDatabase.suspendUser(userID);
        } else {
            await usersDatabase.addActivity(req.user, "unSuspendUser", userID);
            usersDatabase.unSuspendUser(userID);
        }
        res.sendStatus(200);
    }
}

module.exports = {
    identifyAuthorisedUser,
    forbidUnauthorised,
    get_adminPannelPage,
    get_adminLoginPage,
    get_adminAddArticle,
    post_adminLoginCheck,
    post_adminLogout,
    post_adminAddUser,
    post_adminChangeUserPassword,
    post_adminSuspendUser,
}

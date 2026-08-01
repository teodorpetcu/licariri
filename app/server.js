const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

// for ensuring that the databases are loaded before the server starts listening
const { createDataDirectoriesIfTheyDontExist } = require("./utils/util.js");
const { usersDatabase } = require("./models/admin.js");
const { articleDatabase } = require("./models/articles.js");
const { queryDatabase } = require("./models/query.js");

const {
    updateMainPage,

    get_mainPage,
    get_articlePage,

    post_adminAPI_addArticle,
    post_adminAPI_articlePreview,
    //post_adminAPI_RemoveArticle,
    post_adminAPI_addMagazine,
    post_adminAPI_removeMagazine,
    post_adminAPI_updateArticleStage,
} = require("./controllers/articles.js")

const {
    get_queryPage,
} = require("./controllers/query.js");

const {
    identifyAuthorisedUser,
    forbidUnauthorised,

    get_adminLoginPage,
    get_adminPage,
    get_adminAddArticlePage,

    get_adminAPI_users,
    get_adminAPI_activity,
    get_adminAPI_articles,
    get_adminAPI_magazines,
    post_adminAPI_loginCheck,
    post_adminAPI_logout,
    post_adminAPI_addUser,
    post_adminAPI_changeUserPassword,
    post_adminAPI_suspendUser,
} = require("./controllers/admin.js")

const {
    LISTENING_PORT,
    MAGAZINES_PATH,
    MAGAZINE_THUMBNAILS_PATH,
    PUBLIC_ARTICLE_IMAGES_PATH,
    DRAFT_ARTICLE_IMAGES_PATH,
    TRASH_ARTICLE_IMAGES_PATH,
    SITEMAP_FILE_PATH,
} = require("./config.js");

const { logger, requestLogger } = require("./services/logger.js");

const app = express();

app.set("trust proxy", ["loopback"]);
app.disable("x-powered-by");

// putting this before other `app.use()` calls makes it not use other middleware
app.get("/robots.txt", requestLogger, (_, res) => res.sendFile(__dirname + "/public/robots.txt"));
// REMEMBER TO ADD `Sitemap` CLAUSE TO robots.txt !!!!
app.get("/sitemap.xml", requestLogger, (_, res) => res.sendFile(SITEMAP_FILE_PATH));

app.set("view engine", "ejs");

app.use(fileUpload());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.use((err, _req, res, _next) => {
    logger.error("express route", err);
    res.status(500).send("Ceva s-a stricat! (Eroare HTTP 500)");
});

app.get("/favicon.ico", requestLogger, (_, res) => res.sendFile(__dirname + "/public/favicon.ico"));
app.get("/css/licariri.css", requestLogger, (_, res) => res.sendFile(__dirname + "/public/css/licariri.css"));
app.get("/js/main-nav.js", requestLogger, (_, res) => res.sendFile(__dirname + "/public/js/main-nav.js"));
app.get("/squiggly-line.svg", requestLogger, (_, res) => res.sendFile(__dirname + "/public/squiggly-line.svg"));
app.get("/logo-mesota.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/public/logo-mesota.webp"));
app.get("/logo-website.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/public/logo-website.webp"));
app.get("/logo-mic.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/public/logo-mic.webp"));
app.use("/articles/images", requestLogger, express.static(PUBLIC_ARTICLE_IMAGES_PATH));
app.use("/magazines", requestLogger, express.static(MAGAZINES_PATH));
app.use("/magazines/thumbnails", requestLogger, express.static(MAGAZINE_THUMBNAILS_PATH));

app.get("/", requestLogger, get_mainPage);
app.get("/articles/:articleID", get_articlePage);

if (process.env.ALLOW_QUERY_ROUTES == "true") {
    logger.info("/query routes FUNCTIONAL");
    app.get("/query", requestLogger, get_queryPage);
} else {
    logger.info("/query routes NONFUNCTIONAL");
}

if (process.env.ALLOW_ADMIN_ROUTES == "true") {
    logger.info("/login, /admin routes FUNCTIONAL");
    app.get("/css/login.css", requestLogger, (_, res) => res.sendFile(__dirname + "/public/css/login.css"));
    app.get("/js/admin.js", requestLogger, (_, res) => res.sendFile(__dirname + "/public/js/admin.js"));
    app.get("/login", requestLogger, get_adminLoginPage);
    app.post("/login", requestLogger, post_adminAPI_loginCheck);
    app.post("/admin/logout", requestLogger, post_adminAPI_logout);

    app.use(["/admin", "/admin/*", "/css/admin.css"], identifyAuthorisedUser, forbidUnauthorised);

    app.get("/css/admin.css", requestLogger, (_, res) => res.sendFile(__dirname + "/public/css/admin.css"));
    app.get("/admin", requestLogger, get_adminPage);

    app.get("/admin/activity", requestLogger, get_adminAPI_activity);

    app.get("/admin/articles", requestLogger, get_adminAPI_articles);
    app.get("/admin/articles/new", requestLogger, get_adminAddArticlePage);
    app.get("/admin/articles/:articleID", requestLogger, get_adminAddArticlePage);
    app.post("/admin/articles/article-preview", requestLogger, post_adminAPI_articlePreview);
    app.post("/admin/articles/:articleID/stage", requestLogger, post_adminAPI_updateArticleStage);
    app.post("/admin/articles/:articleID", requestLogger, post_adminAPI_addArticle);
    //app.post("/admin/articles/remove", requestLogger, post_adminAPI_removeArticle);

    app.get("/admin/magazines", requestLogger, get_adminAPI_magazines);
    app.post("/admin/magazines/add", requestLogger, post_adminAPI_addMagazine);
    app.post("/admin/magazines/remove", requestLogger, post_adminAPI_removeMagazine);

    app.use("/admin/articles/images", requestLogger);
    app.use("/admin/articles/images", express.static(PUBLIC_ARTICLE_IMAGES_PATH), express.static(DRAFT_ARTICLE_IMAGES_PATH), express.static(TRASH_ARTICLE_IMAGES_PATH));

    // TODO: implement a single function to handle authorisation at the
    // middleware level (not all users are allowed to manage other users)
    app.get("/admin/users", requestLogger, get_adminAPI_users);
    app.post("/admin/users/new", requestLogger, post_adminAPI_addUser);
    app.post("/admin/users/suspend", requestLogger, post_adminAPI_suspendUser);
    app.post("/admin/change-password", requestLogger, post_adminAPI_changeUserPassword);

} else {
    logger.info("/login, /admin routes NONFUNCTIONAL");
}

app.get("*", requestLogger, (req, res) => res.status(404).render("404", {url: req.url}));

let httpServer = undefined;

logger.info("connecting to databases...");
logger.info("connecting to databases...");
createDataDirectoriesIfTheyDontExist()
    .then(() => Promise.all([
        articleDatabase.open().then(articleDatabase.init()),
        usersDatabase.open().then(usersDatabase.init()),
        queryDatabase.open().then(queryDatabase.init()),
    ]))
    .then(() => logger.info("database open ok"))
    .then(() => updateMainPage())
    .then(() => {
        httpServer = app.listen(LISTENING_PORT, () => logger.info(`web server up`));
    })
    .catch((err) => {
        logger.error(`failed to start server`, err);
        process.exit(1);
    });

const gracefulShutdown = async (signal) => {
    logger.info(`received ${signal} signal; terminating...`);
    await Promise.all([
        articleDatabase.close(),
        usersDatabase.close(),
        queryDatabase.close(),
    ])
        .then(() => {
            logger.info("database close ok")
        })
        .then(() => {
            if (httpServer) {
                httpServer.close((err) => {
                    logger.info("web server down");
                    process.exit(err ? 1 : 0);
                })
            } else {
                process.exit(0);
            }
        })
        .catch((err) => {
            logger.error("closing database", err)
        })
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

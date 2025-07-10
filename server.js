const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");

// for ensuring that the databases are loaded before the server starts listening
const { usersDatabase } = require("./models/admin.js");
const { articleDatabase } = require("./models/articles.js");
const { viewsDatabase } = require("./models/view-count.js");
const { queryDatabase } = require("./models/query.js");

const {
    updateMainPage,
    get_mainPage,
    get_articlePage,

    post_adminAddArticle,
    //post_adminRemoveArticle,
    post_adminAddMagazine,
    post_adminRemoveMagazine,
    post_updateArticleStage,
} = require("./controllers/articles.js")

const {
    get_queryPage,
} = require("./controllers/query.js");

const {
    identifyAuthorisedUser,
    forbidUnauthorised,

    get_adminLoginPage,
    get_adminPannelPage,
    get_adminAddArticle,
    get_adminActivitiesPage,

    post_adminAddUser,
    post_adminLoginCheck,
    post_adminLogout,
    post_adminChangeUserPassword,
    post_adminSuspendUser,
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

const { logger, requestLogger } = require("./logger.js");

const app = express();

app.set("trust proxy", ["loopback"]);
app.disable("x-powered-by");

// putting this before other `app.use()` calls makes it not use other middleware
app.get("/robots.txt", requestLogger, (_, res) => res.sendFile(__dirname + "/robots.txt"));
// REMEMBER TO ADD `Sitemap` CLAUSE TO robots.txt !!!!
app.get("/sitemap.xml", requestLogger, (_, res) => res.sendFile(SITEMAP_FILE_PATH));

app.set("view engine", "ejs");

app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.use((err, _req, res, _next) => {
    logger.error("express route", err);
    res.status(500).send("Ceva s-a stricat! (Eroare HTTP 500)");
});

app.get("/css/licariri.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/licariri.css"));
app.get("/squiggly-line.svg", requestLogger, (_, res) => res.sendFile(__dirname + "/squiggly-line.svg"));
app.get("/logo-mesota.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/logo-mesota.webp"));
app.get("/logo-website.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/logo-website.webp"));
app.get("/logo-mic.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/logo-mic.webp"));
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
    app.get("/css/login.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/login.css"));
    app.get("/login", requestLogger, get_adminLoginPage);
    app.post("/login", requestLogger, post_adminLoginCheck);

    app.use(["/admin", "/admin/*", "/css/admin.css"], identifyAuthorisedUser, forbidUnauthorised);

    app.get("/css/admin.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/admin.css"));
    app.get("/admin", requestLogger, get_adminPannelPage);

    app.get("/admin/activity", requestLogger, get_adminActivitiesPage);

    app.get("/admin/articles/new", requestLogger, get_adminAddArticle);
    app.get("/admin/articles/:articleID", requestLogger, get_adminAddArticle);

    app.post("/admin/logout", requestLogger, post_adminLogout);
    app.post("/admin/articles/stage", requestLogger, post_updateArticleStage);
    app.post("/admin/articles/:articleID", requestLogger, post_adminAddArticle);
    //app.post("/admin/articles/remove", requestLogger, post_adminRemoveArticle);
    app.post("/admin/user/add", requestLogger, post_adminAddUser);
    app.post("/admin/user/suspend", requestLogger, post_adminSuspendUser);
    app.post("/admin/user/password", requestLogger, post_adminChangeUserPassword);
    app.post("/admin/magazines/add", requestLogger, post_adminAddMagazine);
    app.post("/admin/magazines/remove", requestLogger, post_adminRemoveMagazine);

    app.use("/admin/articles/images", requestLogger);
    app.use("/admin/articles/images", express.static(PUBLIC_ARTICLE_IMAGES_PATH), express.static(DRAFT_ARTICLE_IMAGES_PATH), express.static(TRASH_ARTICLE_IMAGES_PATH));
} else {
    logger.info("/login, /admin routes NONFUNCTIONAL");
}

app.get("*", requestLogger, (req, res) => res.status(404).render("404", {url: req.url}));

let httpServer = undefined;

logger.info("connecting to databases...");
Promise.all([
    articleDatabase.open().then(articleDatabase.init()),
    usersDatabase.open().then(usersDatabase.init()),
    queryDatabase.open().then(queryDatabase.init()),
    viewsDatabase.open().then(viewsDatabase.init()),
])
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
        viewsDatabase.close(),
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

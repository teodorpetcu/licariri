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
    get_mainPage,
    get_articlePage,

    post_adminAddArticle,
    //post_adminRemoveArticle,
    post_adminAddPDFprint,
    post_adminRemovePDFprint,
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
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
    PUBLIC_ARTICLE_IMAGES_PATH,
    DRAFT_ARTICLE_IMAGES_PATH,
    TRASH_ARTICLE_IMAGES_PATH,
} = require("./config.js");

const { logger, requestLogger } = require("./logger.js");
const { dailyUpdateJobTimer } = require("./cron.js");

const app = express();

app.set("trust proxy", ["loopback"]);
app.disable("x-powered-by");

// putting this before other `app.use()` calls makes it not use other middleware
app.get("/robots.txt", requestLogger, (_, res) => res.sendFile(__dirname + "/robots.txt"));
// REMEMBER TO ADD `Sitemap` CLAUSE TO robots.txt !!!!
//app.get("/sitemap.xml", requestLogger, (_, res) => res.sendFile(__dirname + "/sitemap.xml"));

app.set("view engine", "ejs");

app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.use((err, _req, res, _next) => {
    logger.error("express route", err);
    res.status(500).send("Ceva s-a stricat! (Eroare HTTP 500)");
});

app.get("/css/licariri.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/licariri.css"));
app.get("/main.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/main.webp"));
app.get("/mesotalogo.webp", requestLogger, (_, res) => res.sendFile(__dirname + "/mesotalogo.webp"));
app.use("/articles/images", requestLogger, express.static(PUBLIC_ARTICLE_IMAGES_PATH));
app.use("/pdfprints", requestLogger, express.static(PDFPRINT_CONTENTS_PATH));
app.use("/pdfprints/thumbnails", requestLogger, express.static(PDFPRINT_THUMBNAILS_PATH));

app.get("/", requestLogger, get_mainPage);
app.get("/query", requestLogger, get_queryPage);
app.get("/articles/:articleID", get_articlePage);

// TODO: limit the amount of login attempts
app.get("/login", requestLogger, get_adminLoginPage);
app.post("/login", requestLogger, post_adminLoginCheck);

app.use(["/admin", "/admin/*", "/css/admin.css"], identifyAuthorisedUser, forbidUnauthorised);

app.get("/css/admin.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/admin.css"));
app.get("/admin", requestLogger, get_adminPannelPage);

app.get("/admin/activity", requestLogger, get_adminActivitiesPage);

app.get("/admin/articles/new", requestLogger, get_adminAddArticle);
app.get("/admin/articles/:articleID", requestLogger, get_adminAddArticle);

app.post("/admin/logout", requestLogger, post_adminLogout);
app.post("/admin/articles/:articleID", requestLogger, post_adminAddArticle);
app.post("/admin/articles/stage", requestLogger, post_updateArticleStage);
//app.post("/admin/articles/remove", requestLogger, post_adminRemoveArticle);
app.post("/admin/user/add", requestLogger, post_adminAddUser);
app.post("/admin/user/suspend", requestLogger, post_adminSuspendUser);
app.post("/admin/user/password", requestLogger, post_adminChangeUserPassword);
app.post("/admin/pdfprints/add", requestLogger, post_adminAddPDFprint);
app.post("/admin/pdfprints/remove", requestLogger, post_adminRemovePDFprint);

app.use("/admin/articles/images", requestLogger);
app.use("/admin/articles/images", express.static(PUBLIC_ARTICLE_IMAGES_PATH), express.static(DRAFT_ARTICLE_IMAGES_PATH), express.static(TRASH_ARTICLE_IMAGES_PATH));

app.get("*", requestLogger, (req, res) => res.status(404).render("404", {url: req.url}));

let httpServer = undefined;

logger.info("connecting to databases...");
Promise.all([
    articleDatabase.init(),
    usersDatabase.init(),
    queryDatabase.init(),
    viewsDatabase.init(),
])
    .then(() => {
        httpServer = app.listen(LISTENING_PORT, () => logger.info(`web server up`));
        dailyUpdateJobTimer();
    })
    .catch((err) => {
        logger.error(`failed starting up server`, err);
        process.exit(1);
    });

const gracefulShutdown = (signal) => {
    Promise.all([
        logger.info(`received ${signal} signal; terminating...`),
        articleDatabase.close(),
        usersDatabase.close(),
        queryDatabase.close(),
        viewsDatabase.close(),
    ])
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
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGQUIT", () => gracefulShutdown("SIGQUIT"));

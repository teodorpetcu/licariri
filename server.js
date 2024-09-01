const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const ip = require("ip");

const serverPrivateIP = ip.address();

const {
    get_mainPage,
    get_articlePage,
    get_adminPDFprintPage,

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

    get_adminPannelPage,
    get_adminAddArticle,
    get_adminAddUserPage,
    get_adminChangeUserPassword,

    post_adminAddUser,
    post_adminLoginCheck,
    post_adminLogout,
    post_adminChangeUserPassword,
} = require("./controllers/admin.js")

const {
    LISTENING_PORT,
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
    PUBLIC_ARTICLE_IMAGES_PATH,
    DRAFT_ARTICLE_IMAGES_PATH,
    TRASH_ARTICLE_IMAGES_PATH,
    MAIN_PAGE_BACKGROUND_IMAGE_PATH,
} = require("./config.js");

const { logger, requestLogger } = require("./logger.js");

const app = express();

// putting this before other `app.use()` calls makes it not use other middleware
app.get("/robots.txt", requestLogger, (_, res) => res.sendFile(__dirname + "/robots.txt"));
// REMEMBER TO ADD `Sitemap` CLAUSE TO robots.txt !!!!
//app.get("/sitemap.xml", requestLogger, (_, res) => res.sendFile(__dirname + "/sitemap.xml"));

app.set("view engine", "ejs");

app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.get("/css/licariri.css", requestLogger, (_, res) => res.sendFile(__dirname + "/views/css/licariri.css"));
app.get("/css/admin.css", requestLogger, identifyAuthorisedUser, forbidUnauthorised, (_, res) => res.sendFile(__dirname + "/views/css/admin.css"));
app.use("/articles/images", requestLogger, express.static(PUBLIC_ARTICLE_IMAGES_PATH));
app.use("/pdfprints", requestLogger, express.static(PDFPRINT_CONTENTS_PATH));
app.use("/pdfprints/thumbnails", requestLogger, express.static(PDFPRINT_THUMBNAILS_PATH));
app.use("/admin/articles/images", requestLogger, identifyAuthorisedUser, forbidUnauthorised);
app.use("/admin/articles/images", express.static(PUBLIC_ARTICLE_IMAGES_PATH), express.static(DRAFT_ARTICLE_IMAGES_PATH), express.static(TRASH_ARTICLE_IMAGES_PATH));
app.get("/main.png", requestLogger, (_, res) => res.sendFile(MAIN_PAGE_BACKGROUND_IMAGE_PATH));

app.get("/", requestLogger, get_mainPage);
app.get("/query", requestLogger, get_queryPage);
app.get("/articles/:articleID", get_articlePage);

// TODO: limit the amount of login attempts
app.get("/admin", requestLogger, identifyAuthorisedUser, get_adminPannelPage);

app.get("/admin/articles/new", requestLogger, identifyAuthorisedUser, forbidUnauthorised, get_adminAddArticle);
app.get("/admin/articles/:articleID", requestLogger, identifyAuthorisedUser, forbidUnauthorised, get_adminAddArticle);
app.get("/admin/user/add", requestLogger, identifyAuthorisedUser, forbidUnauthorised, get_adminAddUserPage);
app.get("/admin/user/password", requestLogger, identifyAuthorisedUser, forbidUnauthorised, get_adminChangeUserPassword);
app.get("/admin/pdfprints", requestLogger, identifyAuthorisedUser, forbidUnauthorised, get_adminPDFprintPage);

app.post("/admin", requestLogger, post_adminLoginCheck);
app.post("/admin/logout", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminLogout);
app.post("/admin/articles/:articleID", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddArticle);
app.post("/admin/stage", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_updateArticleStage);
//app.post("/admin/remove", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminRemoveArticle);
app.post("/admin/user/add", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddUser);
app.post("/admin/user/password", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminChangeUserPassword);
app.post("/admin/pdfprints/add", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddPDFprint);
app.post("/admin/pdfprints/remove", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminRemovePDFprint);

app.get("*", requestLogger, (req, res) => res.status(404).render("404", {url: req.url}));

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(LISTENING_PORT, async () => {
    logger.info(`web server up (http://${serverPrivateIP}:${LISTENING_PORT})`);
});

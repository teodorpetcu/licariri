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
    post_adminRemoveArticle,
    post_adminAddPDFprintPage,
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
    post_adminChangeUserPassword,
} = require("./controllers/admin.js")

const {
    LISTENING_PORT,
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
    ARTICLE_IMAGES_PATH,
} = require("./config.js");

const { logger, requestLogger } = require("./logger.js");

const app = express();

app.set("view engine", "ejs");
app.use(fileUpload());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.use("/css", express.static(__dirname + "/views/css"));
app.use("/images", express.static(ARTICLE_IMAGES_PATH), requestLogger);
app.use("/pdfprints", express.static(PDFPRINT_CONTENTS_PATH), requestLogger);
app.use("/pdfprints/thumbnails", express.static(PDFPRINT_THUMBNAILS_PATH), requestLogger);

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
app.post("/admin/articles/:articleID", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddArticle);
app.post("/admin/remove", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminRemoveArticle);
app.post("/admin/user/add", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddUser);
app.post("/admin/user/password", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminChangeUserPassword);
app.post("/admin/pdfprints/add", requestLogger, identifyAuthorisedUser, forbidUnauthorised, post_adminAddPDFprintPage);

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(LISTENING_PORT, async () => {
    logger.info(`web server up (http://${serverPrivateIP}:${LISTENING_PORT})`);
});

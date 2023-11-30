const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const fileUpload = require("express-fileupload");
const ip = require("ip");

const serverPrivateIP = ip.address();

const {
    get_mainPage,
    get_articlePage,
    get_adminRemoveArticle,
    post_adminAddArticle,
    post_adminRemoveArticle,
    get_adminModifyArticle,
    get_adminModifyArticlePage,
    post_adminModifyArticle,
} = require("./controllers/articles.js")

const {
    get_queryPage,
} = require("./controllers/query.js");

const {
    identifyAuthorizedUser,
    forbidUnauthorised,
    get_adminPageView,
    get_adminAddArticlePage,
    post_adminLoginCheck,
    get_adminAddUserPage,
    post_adminAddUser,
} = require("./controllers/admin.js")

const { LISTENING_PORT } = require("./config.js");

const app = express();

app.set("view engine", "ejs");

app.use(fileUpload());

app.use(bodyParser.urlencoded({ extended: true, }));

app.use(cookieParser());

app.use("/css", express.static(__dirname + "/views/css"));

app.use("/images", express.static(__dirname + "/public/images"));

app.get("/", get_mainPage);

app.get("/query", get_queryPage);

app.get("/admin", identifyAuthorizedUser, get_adminPageView);

// TODO: limit the amount of login attempts
app.post("/admin", post_adminLoginCheck);

app.get("/admin/add", identifyAuthorizedUser, forbidUnauthorised, get_adminAddArticlePage);

app.post("/admin/add", identifyAuthorizedUser, forbidUnauthorised, post_adminAddArticle);

app.get("/admin/remove", identifyAuthorizedUser, forbidUnauthorised, get_adminRemoveArticle);

app.post("/admin/remove", identifyAuthorizedUser, forbidUnauthorised, post_adminRemoveArticle);

app.get("/admin/modify", identifyAuthorizedUser, forbidUnauthorised, get_adminModifyArticle);

app.get("/admin/modify/:article_id", identifyAuthorizedUser, forbidUnauthorised, get_adminModifyArticlePage);

app.post("/admin/modify/:article_id", identifyAuthorizedUser, forbidUnauthorised, post_adminModifyArticle);

app.get("/admin/user/add", identifyAuthorizedUser, forbidUnauthorised, get_adminAddUserPage);

app.post("/admin/user/add", identifyAuthorizedUser, forbidUnauthorised, post_adminAddUser);

app.get("/articles/:article_id", get_articlePage);

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(LISTENING_PORT, async () => {
    console.log(`Web server up (http://${serverPrivateIP}:${LISTENING_PORT})`);
});

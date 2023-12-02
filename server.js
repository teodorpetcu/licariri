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
    get_adminListModifiableArticles,
    get_adminModifyArticle,

    post_adminAddArticle,
    post_adminRemoveArticle,
    post_adminModifyArticle,
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
app.get("/articles/:articleID", get_articlePage);

// TODO: limit the amount of login attempts
app.get("/admin", identifyAuthorisedUser, get_adminPannelPage);

app.get("/admin/add", identifyAuthorisedUser, forbidUnauthorised, get_adminAddArticle);
app.get("/admin/remove", identifyAuthorisedUser, forbidUnauthorised, get_adminRemoveArticle);
app.get("/admin/modify", identifyAuthorisedUser, forbidUnauthorised, get_adminListModifiableArticles);
app.get("/admin/modify/:articleID", identifyAuthorisedUser, forbidUnauthorised, get_adminModifyArticle);
app.get("/admin/user/add", identifyAuthorisedUser, forbidUnauthorised, get_adminAddUserPage);
app.get("/admin/user/password", identifyAuthorisedUser, forbidUnauthorised, get_adminChangeUserPassword);

app.post("/admin", post_adminLoginCheck);
app.post("/admin/add", identifyAuthorisedUser, forbidUnauthorised, post_adminAddArticle);
app.post("/admin/remove", identifyAuthorisedUser, forbidUnauthorised, post_adminRemoveArticle);
app.post("/admin/modify/:articleID", identifyAuthorisedUser, forbidUnauthorised, post_adminModifyArticle);
app.post("/admin/user/add", identifyAuthorisedUser, forbidUnauthorised, post_adminAddUser);
app.post("/admin/user/password", identifyAuthorisedUser, forbidUnauthorised, post_adminChangeUserPassword);

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(LISTENING_PORT, async () => {
    console.log(`Web server up (http://${serverPrivateIP}:${LISTENING_PORT})`);
});

const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const {
    get_mainPage,
    get_queryPage,
    get_articlePage,
    post_adminAddArticle,
} = require("./controllers/articles.js")

const {
    forbidUnauthorised,
    get_adminPageView,
    get_adminAddArticlePage,
    post_adminLoginCheck,
} = require("./controllers/admin.js")

const { LISTENING_PORT } = require("./config.js");

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true, }));

app.use(cookieParser());

app.use("/css", express.static(__dirname + "/views/css"));

app.get("/", get_mainPage);

app.get("/query", get_queryPage);

app.get("/admin", get_adminPageView);

// TODO: limit the amount of login attempts
app.post("/admin", post_adminLoginCheck);

app.get("/admin/add", forbidUnauthorised, get_adminAddArticlePage);

app.post("/admin/add", forbidUnauthorised, post_adminAddArticle);

// TODO: move articles to the `/articles` route
app.get("/:article_id", get_articlePage);

// TODO: ensure that we first connect to all the databases before starting to
// listen on the internet
app.listen(LISTENING_PORT, () => {
    console.log(`Web server up (http://localhost:${LISTENING_PORT})`);
});

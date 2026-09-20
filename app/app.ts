// Copyright (C) 2026  Teodor Petcu  <petcuteodor03@gmail.com>
// This file is part of licariri.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import express, { type Request, type Response, type NextFunction, type Application } from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import fileUpload from "express-fileupload";

// for ensuring that the databases are loaded before the server starts listening
import { createDataDirectoriesIfTheyDontExist } from "./utils/util.ts";
import usersDatabase from "./models/admin.ts";
import articleDatabase from "./models/articles.ts";
import queryDatabase from "./models/query.ts";

import {
    updateMainPage,

    get_mainPage,
    get_articlePage,

    get_adminAddArticlePage,

    get_adminAPI_articles,
    get_adminAPI_magazines,
    validateArticleModificationRequestBody,
    post_adminAPI_addArticle,
    put_adminAPI_modifyArticle,
    post_adminAPI_articlePreview,
    //post_adminAPI_RemoveArticle,
    post_adminAPI_addMagazine,
    post_adminAPI_removeMagazine,
    post_adminAPI_updateArticleStage,
} from "./controllers/articles.ts";

import {
    get_queryPage,
} from "./controllers/query.ts";

import {
    identifyAuthorisedUser,
    forbidUnauthorised,

    get_adminLoginPage,
    get_adminPage,

    get_adminAPI_users,
    get_adminAPI_activity,
    post_adminAPI_loginCheck,
    post_adminAPI_logout,
    post_adminAPI_addUser,
    post_adminAPI_changeUserPassword,
    post_adminAPI_suspendUser,
} from "./controllers/admin.ts";

import {
    LISTENING_PORT,
    MAGAZINES_PATH,
    MAGAZINE_THUMBNAILS_PATH,
    PUBLIC_ARTICLE_IMAGES_PATH,
    DRAFT_ARTICLE_IMAGES_PATH,
    TRASH_ARTICLE_IMAGES_PATH,
    SITEMAP_FILE_PATH,
} from "./config.ts";

import { logger, requestLogger } from "./services/logger.ts";

const app = express();

app.set("trust proxy", ["loopback"]);
app.disable("x-powered-by");

// putting this before other `app.use()` calls makes it not use other middleware
app.get("/robots.txt", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/robots.txt"));
app.get("/sitemap.xml", requestLogger, (_: Request, res: Response) => res.sendFile(SITEMAP_FILE_PATH));

app.set("view engine", "ejs");

app.use(fileUpload());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true, }));
app.use(cookieParser());

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error(err, "express route");
    res.status(500).send("Ceva s-a stricat! (Eroare HTTP 500)");
});

// assets
app.get("/favicon.ico", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/favicon.ico"));
app.get("/css/licariri.css", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/css/licariri.css"));
app.get("/js/main-nav.js", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/js/main-nav.js"));
app.get("/squiggly-line.svg", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/squiggly-line.svg"));
app.get("/logo-mesota.webp", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/logo-mesota.webp"));
app.get("/logo-website.webp", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/logo-website.webp"));
app.get("/logo-mic.webp", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/logo-mic.webp"));
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
    app.get("/css/login.css", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/css/login.css"));
    app.get("/js/admin.js", requestLogger, identifyAuthorisedUser, forbidUnauthorised,
            (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/js/admin.js"));
    app.get("/js/edit-article.js", requestLogger, identifyAuthorisedUser, forbidUnauthorised,
            (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/js/edit-article.js"));
    app.get("/login", requestLogger, get_adminLoginPage);
    app.post("/login", requestLogger, post_adminAPI_loginCheck);
    app.post("/admin/logout", requestLogger, post_adminAPI_logout);

    app.use(["/admin", "/admin/*", "/css/admin.css"], identifyAuthorisedUser, forbidUnauthorised);

    app.get("/css/admin.css", requestLogger, (_: Request, res: Response) => res.sendFile(import.meta.dirname + "/public/css/admin.css"));
    app.get("/admin", requestLogger, get_adminPage);

    app.get("/admin/activity", requestLogger, get_adminAPI_activity);

    app.get("/admin/articles", requestLogger, get_adminAPI_articles);
    app.get("/admin/articles/new", requestLogger, get_adminAddArticlePage);
    app.get("/admin/articles/:articleID", requestLogger, get_adminAddArticlePage);
    app.post("/admin/articles/:articleID/preview", requestLogger, validateArticleModificationRequestBody, post_adminAPI_articlePreview);
    app.post("/admin/articles/:articleID", requestLogger, validateArticleModificationRequestBody, post_adminAPI_addArticle);
    app.put("/admin/articles/:articleID", requestLogger, validateArticleModificationRequestBody, put_adminAPI_modifyArticle);
    app.post("/admin/articles/:articleID/stage", requestLogger, post_adminAPI_updateArticleStage);
    //app.post("/admin/articles/remove", requestLogger, post_adminAPI_removeArticle);

    app.get("/admin/magazines", requestLogger, get_adminAPI_magazines);
    app.post("/admin/magazines/add", requestLogger, post_adminAPI_addMagazine);
    app.post("/admin/magazines/remove", requestLogger, post_adminAPI_removeMagazine);

    app.use("/admin/articles/images", requestLogger, identifyAuthorisedUser, forbidUnauthorised);
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

app.get("*", requestLogger, (req: Request, res: Response) => res.status(404).render("404", {url: req.url}));

let httpServer: Application = undefined;

logger.info("connecting to databases...");
createDataDirectoriesIfTheyDontExist()
    .then(() => Promise.all([
        articleDatabase.open().then(() => articleDatabase.init()),
        usersDatabase.open().then(() => usersDatabase.init()),
        queryDatabase.open().then(() => queryDatabase.init()),
    ]))
    .then(() => logger.info("database open ok"))
    .then(() => updateMainPage())
    .then(() => {
        httpServer = app.listen(LISTENING_PORT, () => logger.info(`web server up`));
    })
    .catch((err) => {
        logger.error(err, "failed to start server");
        process.exit(1);
    });

const gracefulShutdown = async (signal: string) => {
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
                httpServer.close((err: Error) => {
                    logger.info("web server down");
                    process.exit(err ? 1 : 0);
                })
            } else {
                process.exit(0);
            }
        })
        .catch((err) => {
            logger.error(err, "closing database")
            process.exit(1);
        })
}

["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal))
});

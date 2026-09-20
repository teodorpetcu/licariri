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

import { exec } from "node:child_process";
import { marked } from "marked";
import ejs from "ejs";
import sharp from "sharp";
import { type Request, type Response, type NextFunction } from "express";
import { type UploadedFile } from "express-fileupload";

import { logger } from "../services/logger.ts";
import { fileExists, readFileIfExists, renameFileIfExists, unlinkFileIfExists, writeFile } from "../utils/util.ts";

import { newArticle, newMagazine, generateArticleID, type ArticleMeta, type Article, type UserActivityAction, ArticleModificationRequestBody, SanitisedArticleModificationRequestBody, getArticleHTMLFilePath, getArticleMarkdownFilePath, getArticleThumbnailPath } from "../models/types.ts";
import { prerenderQueryFilesForArticle } from "./query.ts";
import articleDatabase from "../models/articles.ts";
import queryDatabase from "../models/query.ts";
import usersDatabase from "../models/admin.ts";

import generateSitemapFile from "../services/sitemap-generator.ts";

import {
    MAIN_PAGE_HTML_FILE_PATH,
    PUBLIC_ARTICLE_CONTENTS_PATH,
    MAGAZINES_PATH,
    WEBP_COMPRESSION_QUALITY,
} from "../config.ts";

const renderArticleTemplate = async (article: Article, htmlContents: string, queryAllowed = false, preview = false) => {
    return await ejs.renderFile(import.meta.dirname + "/../views/article.ejs", {
        article,
        contents: htmlContents,
        QUERY_ROUTES_ALLOWED: queryAllowed,
        preview
    }, {async: true});
}

export const generateArticleTextFiles = async (article: Article, markdownContents: string): Promise<void> => {
    // TODO: use another function to write markdown contents
    // side effects are a mess
    const htmlContents = marked.parse(markdownContents).trim();
    const QUERY_ROUTES_ALLOWED = process.env.ALLOW_QUERY_ROUTES == "true";
    const renderedPage = await renderArticleTemplate(article, htmlContents, QUERY_ROUTES_ALLOWED, false);

    return writeFile(getArticleMarkdownFilePath(article), markdownContents)
        .then(() => writeFile(getArticleHTMLFilePath(article), renderedPage))
        .then(() => Promise.resolve())
        .catch((err) => {
            logger.error(err, "rendering article page");
            return Promise.reject();
        });
}

// render article based on existing contents
export const reRenderArticle = async (article: Article): Promise<void> => {
    return await readFileIfExists(getArticleMarkdownFilePath(article))
        .then((markdownContent) => generateArticleTextFiles(article, markdownContent));
}

// re-render all article based on existing contents
const reRenderAllArticles = async (): Promise<void> => {
    const articles = await articleDatabase.searchArticles();
    return await Promise.all(articles.map(async (article) => {
        return await reRenderArticle(article)
    }))
        .then(() => {logger.info("successfully re-rendered all articles")})
        .catch((err) => {
            logger.error(err, "re-rendering all articles");
            Promise.reject(err);
        });
}

export const updateMainPage = async (): Promise<void> => {
    let [articles, magazines] = await Promise.all([
        articleDatabase.searchArticles("stage", "public"),
        articleDatabase.getAllMagazinesSorted(),
    ]).catch((err) => {
        logger.error(err, `searching articles & magazines for main page`);
        return [];
    });

    // ignore everything before 2026
    articles = articles.filter((article) => article.timestamp > 1767218400000);

    // to avoid including the editorial volume, which is in a highlight
    // container on the main page
    magazines.shift();

    const renderedPage = await ejs.renderFile(import.meta.dirname + "/../views/main.ejs", {articles, magazines}, {async: true});
    return Promise.all([
        writeFile(`${MAIN_PAGE_HTML_FILE_PATH}`, renderedPage),
        generateSitemapFile(),
    ])
        .then(() => Promise.resolve())
        .catch((err) => {
            logger.error(err, "writing main page HTML file");
            return Promise.reject(err);
        });
}

export const get_mainPage = (_: Request, res: Response): void => {
    res.sendFile(`${MAIN_PAGE_HTML_FILE_PATH}`);
}

export const get_articlePage = async (req: Request, res: Response): Promise<void> => {
    const articleID = req.params.articleID;
    if (await fileExists(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`)) {
        res.sendFile(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`);
    } else {
        res.render("404");
    }
}

export const post_adminAPI_articlePreview = async (req: Request, res: Response): Promise<void> => {
    const originalArticle = await articleDatabase.getArticleMeta(req.params.articleID);
    const article: Article = req.body.article;
    if (originalArticle) {
        article.id = originalArticle.id;
        article.date = originalArticle.date;
        article.timestamp = originalArticle.timestamp;
        article.stage = originalArticle.stage;
    }

    const htmlContents = marked.parse(req.body.markdownContents).trim();

    await renderArticleTemplate(article, htmlContents, false, true)
        .then((renderedPage: string) => {
            res.set("Content-Type", "text/html").send(renderedPage);
        })
}

export const post_adminAPI_addArticle = async (req: Request, res: Response): Promise<void> => {
    const wantedTitle = req.body.article.title;
    const wantedID = generateArticleID(wantedTitle);
    const articleWithWantedIDExists = await articleDatabase.getArticleMeta(wantedID) ? true : false;

    if (articleWithWantedIDExists) {
        // database constraint: unique IDs
        res.sendStatus(400);
        logger.error(Error("Cannot create article; one with the same ID already exists"), `POST /admin/articles/${req.params.id}`)
        return;
    }

    const article: Article = req.body.article;
    const thumbnail: UploadedFile|undefined = req.files?.thumbnail;

    return await Promise.all([
        // full article metadata
        articleDatabase.saveArticle(article),
        // markdown + HTML
        generateArticleTextFiles(article, req.body.markdownContents),
        // thumbnail
        saveArticleThumbnail(article, thumbnail),
    ])
        .then(() => updateMainPage())
        .then(() => {
            if (article.stage == "public") {
                res.redirect(`/articles/${article.id}`);
            } else {
                res.redirect("/admin");
            }
        })
        .catch((err) => {
            logger.error(err, `POST /admin/articles/${article.id}`);
            res.sendStatus(500);
        });
}

export const put_adminAPI_modifyArticle = async (req: Request, res: Response): Promise<void> => {
    const originalID = req.params.articleID;
    const wantedTitle = req.body.article.title;
    const wantedID = generateArticleID(wantedTitle);
    const articleWithWantedIDExists = await articleDatabase.getArticleMeta(wantedID) ? true : false;
    // the original article resource is... supposedly guaranteed to exist
    const originalArticle: ArticleMeta = (await articleDatabase.getArticleMeta(originalID))!;

    const article: Article = req.body.article;
    article.timestamp = originalArticle.timestamp;
    article.date = originalArticle.date;
    article.stage = originalArticle.stage;
    const markdownContents = req.body.markdownContents;
    const thumbnail: UploadedFile = req.files?.thumbnail;

    // keep the original title and id when:
    // 1) there is a rename AND an article with the wanted ID already exists
    // 2) the wanted article id is empty OR it's "new"
    if ((articleWithWantedIDExists && wantedID != originalID) || !article.id || article.id == "new") {
        // CAUSES A MISMATCH BETWEEN TITLE AND ID
        article.title = wantedTitle;
        article.id = originalID;
    }

    await Promise.all([
        articleDatabase.updateArticle(originalArticle.id, article),
        removeArticleTextFiles(originalArticle).then(() => generateArticleTextFiles(article, markdownContents)),
        // NOTE: misleading function name; can also save the thumbnail provided
        // by the user, even if there is no original thumbnail
        replaceArticleThumbnail(originalArticle, article, thumbnail),

        // TODO PROBLEM: this queryDatabase call singlehandedly locks the entire
        // database and makes it busy... FOR SEVERAL SECONDS. No more database
        // reads or writes FOR SEVERAL SECONDS afterwards.
        // TODO SOLUTION: maybe move the query database to a different file, so
        // that it doesn't lock up the main database. Maybe migrate from SQLite
        // to PostgreSQL
        //queryDatabase.unindexArticle(originalArticle.id)
            //.finally(() => queryDatabase.indexArticle(article.id, content));
    ])
        .then(() => updateMainPage())
        .then(() => prerenderQueryFilesForArticle(article))
        .then(() => {
            // on a rename, update activity entries to point to the new article id
            if (article.id != originalArticle.id) {
                usersDatabase.changeActivityTarget("modify", originalArticle.id, article.id);
                usersDatabase.addActivity(req.user, "rename", originalArticle.id + "::" + article.id);
            }
            usersDatabase.addActivity(req.user, "modify", article.id);
        })
        .then(() => {
            if (article.stage == "public") {
                // TODO: modifying public articles should actually be restricted
                // to admin privileges, right?
                res.redirect(`/articles/${article.id}`);
            } else {
                // TODO: display a success message somewhere
                res.redirect("/admin");
            }
        })
        .catch((err) => {
            logger.error(err, `PUT /admin/articles/${article.id}`);
            res.sendStatus(500);
        });
}

export const validateArticleModificationRequestBody = (req: Request, res: Response, next: NextFunction) => {
    if (! req.body.article) {
        return res.status(400).send("no article body in request body");
    } else if (req.body.markdownContents == undefined) {
        return res.status(400).send("no markdownContents in request body");
    }
    if (typeof req.body.article == "string") {
        req.body.article = JSON.parse(req.body.article);
    }
    req.body = sanitiseArticleModificationRequestBody(req.body)
    next();
}

const sanitiseArticleModificationRequestBody = (reqBody: ArticleModificationRequestBody): SanitisedArticleModificationRequestBody => {
    return {
        article: newArticle({
            title: reqBody.article.title.replace(/\//g, "").trim(), // remove slashes
            subtitle: reqBody.article.subtitle.trim(),
            style: reqBody.article.style,
            tags: reqBody.article.tags.sort(),
            authors: reqBody.article.authors.sort(),
            credits: reqBody.article.credits,
            //description: reqBody.contents.slice(0, 250),
            // NOTE: don't forget to change `timestamp` and `stage` if an
            // original article exists
        }),
        markdownContents: reqBody.markdownContents,
    };
}

const removeArticleTextFiles = async (article: ArticleMeta): Promise<void> => {
    return await Promise.all([
        unlinkFileIfExists(getArticleHTMLFilePath(article)),
        unlinkFileIfExists(getArticleMarkdownFilePath(article)),
    ])
        .then(() => Promise.resolve())
        .catch((err) => {
            logger.error(err, "removing article files");
            Promise.reject(err);
        });
}

const saveArticleThumbnail = async (article: ArticleMeta, thumbnail: UploadedFile|undefined): Promise<void> => {
    if (thumbnail && /^image?/.test(thumbnail.mimetype)) {
        return await sharp(thumbnail.data)
            .webp({quality: WEBP_COMPRESSION_QUALITY})
            .toFile(getArticleThumbnailPath(article))
            .then(() => Promise.resolve())
            .catch((err) => {
                logger.error(err, "saving article thumbnail");
                Promise.reject();
            });
    }
}

const replaceArticleThumbnail = async (originalArticle: ArticleMeta, article: ArticleMeta, thumbnail?: UploadedFile|undefined): Promise<void> => {
    if (thumbnail && /^image?/.test(thumbnail.mimetype)) {
        // new thumbnail: delete old thumbnail, save the new one
        // (NOTE: saving a new thumbnail can overwrite the old one ONLY IF
        // there's no rename; doing `unlink` accounts for a thumbnail being
        // provided AND an article rename at the same time)
        return await unlinkFileIfExists(getArticleThumbnailPath(originalArticle))
            .then(() => saveArticleThumbnail(article, thumbnail))
            .catch((err) => {
                logger.error(err, "replacing article thumbnail");
                return Promise.reject(err);
            });
    } else if (originalArticle.id && originalArticle.id != article.id) {
        // on rename: no image uploaded by user => move the original article's
        // thumbnail to the new location (if it exists)
        return renameFileIfExists(getArticleThumbnailPath(originalArticle), getArticleThumbnailPath(article))
            .catch((err) => {
                logger.error(err, "renaming article thumbnail");
                return Promise.reject(err);
            });
    }
}

export const post_adminAPI_updateArticleStage = async (req: Request, res: Response): Promise<void> => {
    const original = await articleDatabase.getArticleMeta(req.params.articleID);
    if (! original) return res.sendStatus(500);

    const updated: ArticleMeta = { ...original }; // spread to create a copy
    updated.stage = req.body.stage;

    // TODO: ensure the article has a thumbnail, etc. before publishing
    if (updated.stage != original.stage) {
        Promise.all([
            renameFileIfExists(getArticleHTMLFilePath(original), getArticleHTMLFilePath(updated)),
            renameFileIfExists(getArticleMarkdownFilePath(original), getArticleMarkdownFilePath(updated)),
            renameFileIfExists(getArticleThumbnailPath(original), getArticleThumbnailPath(updated)),
        ])
            .then(() => {
                articleDatabase.updateArticleStage(updated);
                updateMainPage();

                let actionType: UserActivityAction = "publish";
                if (updated.stage == "draft" || updated.stage == "trash") {
                    actionType = updated.stage;
                }
                usersDatabase.addActivity(req.user, actionType, updated.id)

                res.redirect("/admin");
            })
            .catch((err) => {
                logger.error(err);
                res.sendStatus(500);
            });
    } else {
        res.status(400).redirect("/admin");
    }
}

export const post_adminAPI_removeArticle = async (req: Request, res: Response): Promise<void> => {
    const articleID = req.body.id;
    return await Promise.all([
        articleDatabase.removeArticle(articleID),
        queryDatabase.unindexArticle(articleID),
    ])
        .then(() => res.redirect("/admin"))
        .catch((err) => {
            logger.error(err);
            res.sendStatus(500);
        });
}

export const post_adminAPI_addMagazine = (req: Request, res: Response): void => {
    const timestamp = new Date(req.body.date).getTime();
    const description = req.body.description.replace(/\//g, "").trim();
    const pdffile = req.files ? req.files.pdffile : undefined;
    const magazine = newMagazine(timestamp, description);

    if (pdffile && /pdf$/.test(pdffile.mimetype)) {
        articleDatabase.addMagazine(magazine);
        const pdffilepath = `${MAGAZINES_PATH}/${magazine.filename}`;
        writeFile(pdffilepath, pdffile.data).then(async () => {
            return await new Promise((resolve, reject) => {
                exec(`${import.meta.dirname + "../make-webp-thumbnail.sh"} ${pdffilepath} --same-directory`, (err, _stdout, _stderr) => {
                    if (err) {
                        return reject(err);
                    } else {
                        return resolve(undefined);
                    }
                })
            })
            .then(() => usersDatabase.addActivity(req.user, "addmagazine", description))
            .then(() => updateMainPage())
            .then(() => res.status(200).redirect("/"))
        })
            .catch((err) => logger.error(err, "extracting magazine thumbnail"))

    } else {
        res.sendStatus(500);
    }
}

export const post_adminAPI_removeMagazine = (req: Request, res: Response): void => {
    const magazineDescription = req.body.description;
    articleDatabase.removeMagazine(magazineDescription)
        .then(() => usersDatabase.addActivity(req.user, "rmmagazine", magazineDescription))
        .then(() => updateMainPage())
        .then(() => res.status(200).redirect("/admin/magazines"))
        .catch((_err) => res.sendStatus(500));
}

const renderEditArticlePageTemplate = async (article: Article, markdownContents: string, method: "post" | "put") => {
    return await ejs.renderFile(import.meta.dirname + "/../views/edit-article.ejs", {
        defaults: article,
        contents: markdownContents,
        method,
    }, { async: true });
}

export const get_adminAddArticlePage = async (req: Request, res: Response): Promise<void> => {
    let article: Article | undefined = await articleDatabase.getArticle(req.params.articleID);
    if (article) {
        await readFileIfExists(getArticleMarkdownFilePath(article))
            .then(async (markdownContents) => {
                const renderedEditArticlePage = await renderEditArticlePageTemplate(article!, markdownContents, "put");
                return res.send(renderedEditArticlePage);
            })
            .catch((err) => {
                logger.error(err, "getting admin add article page")
                return res.sendStatus(500)
            })
    } else {
        const newArticleTitle = await articleDatabase.getNextNewArticleTitle().catch((err) => {
            logger.error(err, "getting admin add article page")
            return res.sendStatus(500);
        })
        article = newArticle({
            stage: "draft",
            title: newArticleTitle,
        });
        const markdownContents = "";
        await renderEditArticlePageTemplate(article, markdownContents, "post")
            .then((renderedPage) => res.send(renderedPage))
            .catch((err) => {
                logger.error(err, "getting admin add article page");
                return res.sendStatus(500);
            })
    }
}

export const get_adminAPI_articles = async (_: Request, res: Response): Promise<void> => {
    return await articleDatabase.searchArticles()
        .then((articles) => res.send(articles))
        .catch((err) => {
            logger.error(err, "GET /admin/articles");
            res.sendStatus(500);
        })
}

export const get_adminAPI_magazines = async (_: Request, res: Response): Promise<void> => {
    const magazines = await articleDatabase.getAllMagazinesSorted();
    res.send(magazines);
}

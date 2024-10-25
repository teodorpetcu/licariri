const marked = require("marked");
const ejs = require("ejs");
const fs = require("fs");
const pdf2img = require("pdf-img-convert")
const sharp = require("sharp");

const { logger } = require("../logger.js")
const { fileExists } = require("../util.js");

const { Author, Article, ArticleStyle } = require("../models/types.js");
const { prerenderQueryAsFile } = require("./query.js");
const { PDFPrint } = require("../models/types.js");
const { articleDatabase } = require("../models/articles.js");
const { queryDatabase } = require("../models/query.js");
const { viewsDatabase } = require("../models/view-count.js");
const { usersDatabase } = require("../models/admin.js")

const {
    MAIN_PAGE_HTML_FILE_PATH,
    ARTICLES_DIRECTORY,
    PUBLIC_ARTICLE_CONTENTS_PATH,
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
    WEBP_COMPRESSION_QUALITY,
} = require("../config.js");

/**
 * @param {Article} article
 * @param {string} content
 * @param {ArticleStyle} articleStyle
 * @returns {Promise<boolean>} `true` if the function succeeds, `false` otherwise
 */
const renderArticlePage = async (article, plainTextContent, articleStyle, credits) => {
    // TODO: use another function to write markdown contents
    article.contents = marked.parse(plainTextContent).trim();
    let renderedPage = await ejs.renderFile(__dirname + "/../views/article.ejs", {article, articleStyle, credits}, {async: true});

    return fs.promises.writeFile(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`, plainTextContent)
        .then(fs.promises.writeFile(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`, renderedPage))
        .then(() => Promise.resolve(true))
        .catch((err) => {logger.error(`rendering article page`, err); return Promise.resolve(false)});
}

const updateMainPage = async () => {
    let [articles, pdfprints] = await Promise.all([
        articleDatabase.searchArticles("stage", "public"),
        articleDatabase.getAllPDFPrintsSorted(),
    ]).catch((err) => logger.error(`searching articles & pdfprints for main page`, err));
    await Promise.all(articles.map(async (article) => {
        return articleDatabase.getArticleStyle(article.id).then((style) => article.style = style);
    })).catch((err) => logger.error(`fetching article styles for main page`, err));
    let renderedPage = await ejs.renderFile(__dirname + "/../views/main.ejs", {articles, pdfprints}, {async: true});
    return fs.promises.writeFile(`${MAIN_PAGE_HTML_FILE_PATH}`, renderedPage)
        .catch((err) => logger.error(`writing main page HTML file`, err));
}

const get_mainPage = async (_, res) => {
    res.sendFile(`${MAIN_PAGE_HTML_FILE_PATH}`);
}

const get_articlePage = async (req, res) => {
    const articleID = req.params.articleID;
    viewsDatabase.logRequest(Date.now(), req.ip, articleID);
    if (await fileExists(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`)) {
        res.sendFile(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`);
    } else {
        res.render("404");
    }
}

const post_adminAddArticle = async (req, res) => {
    const articleID = req.params.articleID;

    const [articleWithSameTitle, originalArticle] = await Promise.all([
        articleDatabase.getArticleMeta(req.body.id),
        articleDatabase.getArticleMeta(articleID),
    ])

    const stage = originalArticle.stage;
    const timestamp = new Date(originalArticle.timestamp);
    const title = req.body.title.replace(/\//g, "").trim();
    const subtitle = req.body.subtitle.trim();
    const language = req.body.language;
    const category = req.body.category;
    const authors = Array.isArray(req.body["authors[]"])
                    // two maps may seem redundant, but it's to ensure proper sorting
                    ? req.body["authors[]"].map((a) => a.trim()).sort().map((a) => new Author(a))
                    : (typeof req.body["authors[]"] === "string"
                        ? [new Author(req.body["authors[]"].trim())]
                        : []);
    const tags = Array.isArray(req.body["tags[]"])
                    ? req.body["tags[]"].map((t) => t.trim()).sort()
                    : (typeof req.body["tags[]"] === "string"
                        ? [req.body["tags[]"].trim()]
                        : []);
    const content = req.body.content.replace(/([<>\\])/g, "\\$1");
    const credits = {
        editorial: req.body.credit_editorial.split(", ").map((name) => name.trim()).sort().filter((a) => a),
        dtp: req.body.credit_dtp.split(", ").map((name) => name.trim()).sort().filter((a) => a),
        thumbnail: req.body.credit_thumbnail.split(", ").map((name) => name.trim()).sort().filter((a) => a),
    }
    // TODO: improve description selection
    const description = content.slice(0, 250);

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(stage, timestamp, title, subtitle, language, category, description, authors, tags);
    const articleStyle = new ArticleStyle(req.body.hide_title_in_thumbnail, req.body.title_font, req.body.title_fill_style, req.body.title_color, req.body.title_fontsize_thumbnail, req.body.title_fontsize_article, req.body.title_fontweight, req.body.title_position, req.body.subtitle_font, req.body.subtitle_fontsize, req.body.subtitle_fontweight, req.body.subtitle_color, req.body.subtitle_position, req.body.dropcap)

    if ((article.id != originalArticle.id && articleWithSameTitle)
        || !article.id) {
        // if there's already an article with the same ID, or the wanted ID is
        // empty, then don't change the title from the original, but otherwise
        // keep the modifications
        article.id = originalArticle.id;
        article.title = originalArticle.title;
    }

    // to keep consistent with other databases
    if (article.id != originalArticle.id) {
        viewsDatabase.renameArticle(originalArticle.id, article.id);
        articleDatabase.removeAllCredits(originalArticle.id);
    }

    let renderStatus = await renderArticlePage(article, content, articleStyle, credits);
    if (renderStatus) {
        // if the article happens to be renamed, then its ID changes, and
        // its leftover files which won't be used anymore must be destroyed
        if (originalArticle.id && originalArticle.id != article.id) {
            Promise.all([
                fileExists(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.html`)
                    .then((st) => {
                        if (st) {
                            return fs.promises.unlink(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.html`);
                        }
                    }),
                fileExists(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.md`)
                    .then((st) => {
                        if (st) {
                            return fs.promises.unlink(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.md`)
                        }
                    })
            ]).catch(logger.error);
        }
        if (thumbnail && /^image/.test(thumbnail.mimetype)) {
            if (originalArticle.id && originalArticle.id != article.id) {
                fs.promises.unlink(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.webp`)
            }
            sharp(thumbnail.data)
                .webp({quality: WEBP_COMPRESSION_QUALITY})
                .toFile(`${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.webp`)
                .catch(err => logger.error(err));
        } else if (originalArticle.id && originalArticle.id != article.id) {
            fileExists(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.webp`)
                .then((st) => {
                    if (st) {
                        return fs.promises.rename(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.webp`,
                            `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.webp`);
                    }
                })
                .catch(logger.error);
        }

        articleDatabase.removeAllCredits(articleID);
        for (let credit of credits.editorial) {
            articleDatabase.addArticleCredit(articleID, credit, "editorial");
        }
        for (let credit of credits.dtp) {
            articleDatabase.addArticleCredit(articleID, credit, "dtp");
        }
        for (let credit of credits.thumbnail) {
            articleDatabase.addArticleCredit(articleID, credit, "thumbnail");
        }
        queryDatabase.unindexArticle(originalArticle.id)
            .finally(() => queryDatabase.indexArticle(article.id, content));
        articleDatabase.updateMetadata(originalArticle.id, article)
            .finally(() => Promise.all(
                    article.authors.map((author) =>
                        prerenderQueryAsFile({author: author.name})
                    ).concat(article.tags.map((tag) =>
                        prerenderQueryAsFile({tag: tag})
                    ))
                )
            );
        articleDatabase.updateArticleStyles(originalArticle.id, article, articleStyle);
        updateMainPage();
        if (article.id != originalArticle.id) {
            usersDatabase.changeActivityTarget("modify", originalArticle.id, article.id);
            usersDatabase.addActivity(req.user, "rename", originalArticle.id + "::" + article.id)
        }
        usersDatabase.addActivity(req.user, "modify", article.id)
    }

    if (article.stage == "public") {
        // actually, editing public articles should be restricted to at least
        // supervisors, right?
        res.redirect(`/articles/${article.id}`);
    } else {
        // display a success message somewhere
        res.redirect(`/admin`);
    }
}

const post_updateArticleStage = async (req, res) => {
    const article = await articleDatabase.getArticleMeta(req.body.id);
    const originalStage = article.stage;
    article.failsafe_setStage(req.body.stage)
    // TODO: ensure the article has a thumbnail, etc. before publishing
    if (article.stage != originalStage) {
        Promises.all([
            fileExists(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.html`)
                .then((st) => {
                    if (st) {
                        return fs.promises.rename(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.html`,
                            `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`);
                    }
                }),

            fileExists(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.md`)
                .then((st) => {
                    if (st) {
                        return fs.promises.rename(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.md`,
                            `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`)
                    }
                }),

            fileExists(`${ARTICLES_DIRECTORY}/${originalStage}/images/${article.id}.webp`)
                .then((st) => {
                    if (st) {
                        return fs.promises.rename(`${ARTICLES_DIRECTORY}/${originalStage}/images/${article.id}.webp`,
                            `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.webp`)
                    }
                }),
        ]).catch(logger.error);
        articleDatabase.updateArticleStage(article);
        updateMainPage();

        let actionType = "publish";
        if (article.stage == "draft" || article.stage == "trash") {
            actionType = article.stage
        }
        usersDatabase.addActivity(req.user, actionType, article.id)

        res.redirect("/admin");
    }
}

const post_adminRemoveArticle = async (req, res) => {
    let articleID = req.body.id;
    await Promise.all([
        articleDatabase.removeArticle(articleID),
        queryDatabase.unindexArticle(articleID),
    ]);
    res.redirect("/admin");
}

const post_adminAddPDFprint = async (req, res) => {
    let timestamp = new Date(req.body.date).getTime();
    let description = req.body.description.replace(/\//g, "").trim();
    let pdffile = req.files ? req.files.pdffile : undefined;
    const pdfprint = new PDFPrint(timestamp, description);

    if (pdffile && /pdf$/.test(pdffile.mimetype)) {
        articleDatabase.addPDFPrint(pdfprint);
        const pdffilepath = `${PDFPRINT_CONTENTS_PATH}/${pdfprint.filename}`;
        fs.promises.writeFile(pdffilepath, pdffile.data);

        pdf2img.convert(pdffile.data,
            conversion_config = {
                height: 750,
                page_numbers: [1],
            }
        )
            .then((img) =>
                sharp(img[0].data)
                    .webp({quality: WEBP_COMPRESSION_QUALITY})
                    .toFile(`${PDFPRINT_THUMBNAILS_PATH}/${pdfprint.description}.webp`)
                    .catch(err => {Promise.reject(err)}))
            .catch((err) => logger.error(`extracting pdfprint thumbnail`, err));

        usersDatabase.addActivity(req.user, "addpdfprint", description)
        updateMainPage();
        res.status(200).redirect("/admin/pdfprints");
    } else {
        res.status(500).redirect("/admin/pdfprints");
    }
}

const post_adminRemovePDFprint = async (req, res) => {
    let pdfprintDescription = req.body.description;
    articleDatabase.removePDFPrint(pdfprintDescription);
    usersDatabase.addActivity(req.user, "rmpdfprint", pdfprintDescription)
    updateMainPage();
    res.status(200).redirect("/admin/pdfprints");
}

module.exports = {
    get_mainPage,
    get_articlePage,
    post_adminAddArticle,
    post_adminRemoveArticle,
    post_adminAddPDFprint,
    post_adminRemovePDFprint,
    post_updateArticleStage,
    renderArticlePage,
};

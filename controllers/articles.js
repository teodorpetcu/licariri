const marked = require("marked");
const ejs = require("ejs");
const fs = require("fs");
const pdf2img = require("pdf-img-convert")

const { logger } = require("../logger.js")

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
} = require("../config.js");

/**
 * @param {Article} article
 * @param {string} content
 * @param {ArticleStyle} articleStyle
 * @returns {Promise<boolean>} `true` if the function succeeds, `false` if it doesn't
 */
const renderArticlePage = async (article, plainTextContent, articleStyle, credits) => {
    return new Promise((resolve) => {
        article.contents = marked.parse(plainTextContent).trim();
        ejs.renderFile(__dirname + "/../views/article.ejs", {article, articleStyle, credits}, async (err, res) => {
            if (err) {
                logger.error(err);
                return resolve(false);
            } else {
                // the contents are also saved in markdown since it makes editing
                // the article a lot easier later; same as with those "articleStyle"
                // options
                fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`, res);
                fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`, plainTextContent);
                return resolve(true);
            }
        });
    })
}

/**
 * Take all articles in the database and re-render their HTML file
 */
const updateAllArticles = async () => {
    const articles = await articleDatabase.searchArticles();
    articles.forEach(async (article) => {
        let content = fs.readFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`, {encoding: "utf-8"});
        let articleStyle = await articleDatabase.getArticleStyle(article.id);
        let status = await renderArticlePage(article, content, articleStyle);
        if (status) {
            logger.info(`re-rendered article "${article.id}"`);
        } else {
            logger.error(`failed re-rendering article "${article.id}"`);
        }
    });
}

const updateMainPage = async () => {
    const pdfprints = await articleDatabase.getAllPDFPrintsSorted();
    let articles = await articleDatabase.searchArticles("stage", "public");
    for (let i = 0; i < articles.length; i++) {
        articles[i].style = await articleDatabase.getArticleStyle(articles[i].id);
    }
    ejs.renderFile(__dirname + "/../views/main.ejs", {articles, pdfprints}, (err, res) => {
        if (err) {
            logger.error(err);
        } else {
            fs.writeFileSync(`${MAIN_PAGE_HTML_FILE_PATH}`, res);
        }
    });
}

const get_mainPage = async (_, res) => {
    await updateMainPage();
    res.sendFile(`${MAIN_PAGE_HTML_FILE_PATH}`);
}

const get_articlePage = async (req, res) => {
    const articleID = req.params.articleID;
    viewsDatabase.logRequest(Date.now(), req.ip, articleID);
    if (fs.existsSync(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`)) {
        res.sendFile(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`);
    } else {
        res.render("404");
    }
}

const post_adminAddArticle = async (req, res) => {
    const articleID = req.params.articleID;
    const originalArticle = await articleDatabase.getArticleMeta(articleID);

    const stage = originalArticle.stage;
    const timestamp = new Date(originalArticle.timestamp);
    const title = req.body.title.trim();
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
    const description = content.slice(0, 250);
    // TODO: thumbnail credits (+ don't forget trim)
    const credits = {
        editorial: req.body.credit_editorial.split(", ").map((name) => name.trim()).filter((a) => a),
        dtp: req.body.credit_dtp.split(", ").map((name) => name.trim()).filter((a) => a),
        thumbnail: req.body.credit_thumbnail.split(", ").map((name) => name.trim()).filter((a) => a),
    }

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(stage, timestamp, title, subtitle, language, category, description, authors, tags);
    const articleStyle = new ArticleStyle(req.body.hide_title_in_thumbnail, req.body.title_font, req.body.title_fill_style, req.body.title_color, req.body.title_fontsize_thumbnail, req.body.title_fontsize_article, req.body.title_fontweight, req.body.title_position, req.body.subtitle_font, req.body.subtitle_fontsize, req.body.subtitle_fontweight, req.body.subtitle_color, req.body.subtitle_position, req.body.dropcap)

    if ((article.id != originalArticle.id && await articleDatabase.getArticleMeta(article.id))
        || !article.id) {
        // if there's already an article with the same ID, or the wanted ID is
        // empty, then don't change the title from the original, but otherwise
        // keep the modifications
        article.id = originalArticle.id;
        article.title = originalArticle.title;
    }

    // rename before rendering, as to keep track of the new view count
    if (article.id != originalArticle.id) {
        viewsDatabase.renameArticle(originalArticle.id, article.id);
    }

    let renderStatus = await renderArticlePage(article, content, articleStyle, credits);
    if (renderStatus) {
        // if the article happens to be renamed, then its ID changes, and
        // its leftover files which won't be used anymore must be destroyed
        if (originalArticle.id && originalArticle.id != article.id) {
            if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.html`)) {
                fs.unlinkSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.html`)
            }
            if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.md`)) {
                fs.unlinkSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/${originalArticle.id}.md`)
            }
        }
        if (thumbnail && /^image/.test(thumbnail.mimetype)) {
            if (originalArticle.id && originalArticle.id != article.id) {
                fs.unlinkSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.png`)
            }
            // it's not actually a guaranteed PNG image, but who cares
            fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.png`, thumbnail.data);
        } else if (originalArticle.id && originalArticle.id != article.id) {
            if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.png`)) {
                fs.renameSync(`${ARTICLES_DIRECTORY}/${originalArticle.stage}/images/${originalArticle.id}.png`,
                                `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.png`);
            }
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
        article.authors.forEach((author) =>
            prerenderQueryAsFile({author: author.name})
        )
        article.tags.forEach((tag) =>
            prerenderQueryAsFile({tag: tag})
        )
        await queryDatabase.unindexArticle(originalArticle.id);
        await queryDatabase.indexArticle(article.id, content);
        articleDatabase.updateMetadata(originalArticle.id, article);
        articleDatabase.updateArticleStyles(originalArticle.id, article, articleStyle);
        await updateMainPage();
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
        if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.html`)) {
            fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.html`,
                           `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`)
        }
        if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.md`)) {
            fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.md`,
                           `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`)
        }
        if (fs.existsSync(`${ARTICLES_DIRECTORY}/${originalStage}/images/${article.id}.png`)) {
            fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/images/${article.id}.png`,
                           `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.png`)
        }
        articleDatabase.updateArticleStage(article);
        await updateMainPage();

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
    //(articlePublisher == req.user.id) {
        await articleDatabase.removeArticle(articleID)
        await queryDatabase.unindexArticle(articleID);
    //}
    res.redirect("/admin");
}

const post_adminAddPDFprint = async (req, res) => {
    let timestamp = new Date(req.body.date).getTime();
    let description = req.body.description;
    let pdffile = req.files ? req.files.pdffile : undefined;
    const pdfprint = new PDFPrint(timestamp, description);

    if (pdffile && /pdf$/.test(pdffile.mimetype)) {
        articleDatabase.addPDFPrint(pdfprint);
        const pdffilepath = `${PDFPRINT_CONTENTS_PATH}/${pdfprint.filename}`;
        fs.writeFileSync(pdffilepath, pdffile.data);
        const thumbnail = (await pdf2img.convert(pdffile.data,
            conversion_config = {
                height: 750,
                page_numbers: [1],
            }))[0];
        fs.writeFileSync(`${PDFPRINT_THUMBNAILS_PATH}/${pdfprint.description}.png`, thumbnail);
        await usersDatabase.addActivity(req.user, "addpdfprint", description)
        await updateMainPage();
        res.status(200).redirect("/admin/pdfprints");
    } else {
        res.status(500).redirect("/admin/pdfprints");
    }
}

const post_adminRemovePDFprint = async (req, res) => {
    let pdfprintDescription = req.body.description;
    articleDatabase.removePDFPrint(pdfprintDescription);
    await usersDatabase.addActivity(req.user, "rmpdfprint", pdfprintDescription)
    await updateMainPage();
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
};

const marked = require("marked");
const ejs = require("ejs");
const fs = require("fs");
const pdf2img = require("pdf-img-convert")

const { logger } = require("../logger.js")

const { Author, Article, ArticleStyle } = require("../models/types.js");
const { PDFPrint } = require("../models/types.js");
const { ArticleDatabase } = require("../models/articles.js");
const { QueryDatabase } = require("../models/query.js");
const { PDFPrintsDatabase } = require("../models/pdf-prints.js");
const { ViewsDatabase } = require("../models/view-count.js");

const {
    MAIN_PAGE_HTML_FILE_PATH,
    ARTICLE_DATABASE_PATH,
    ARTICLES_DIRECTORY,
    PUBLIC_ARTICLE_CONTENTS_PATH,
    QUERY_DATABASE_PATH,
    PDFPRINT_DATABASE_PATH,
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
    VIEWS_DATABASE_PATH,
} = require("../config.js");

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);
articleDatabase.init();

const queryDatabase = new QueryDatabase(QUERY_DATABASE_PATH);
queryDatabase.init();

const pdfprintDatabase = new PDFPrintsDatabase(PDFPRINT_DATABASE_PATH);
pdfprintDatabase.init();

const viewsDatabase = new ViewsDatabase(VIEWS_DATABASE_PATH);
viewsDatabase.init();

const updateMainPage = async () => {
    const pdfprints = await pdfprintDatabase.getAllPDFPrintsSorted();
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
    res.sendFile(`${MAIN_PAGE_HTML_FILE_PATH}`);
}

const get_articlePage = async (req, res) => {
    const articleID = req.params.articleID;
    viewsDatabase.logRequest(Date.now(), req.ip, articleID);
    res.sendFile(`${PUBLIC_ARTICLE_CONTENTS_PATH}/${articleID}.html`);
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
                    ? req.body["authors[]"].map((a) => new Author(a.trim()))
                    : (typeof req.body["authors[]"] === "string"
                        ? [new Author(req.body["authors[]"].trim())]
                        : []);
    const tags = Array.isArray(req.body["tags[]"])
                    ? req.body["tags[]"].map((t) => t.trim())
                    : (typeof req.body["tags[]"] === "string"
                        ? [req.body["tags[]"].trim()]
                        : []);
    const content = req.body.content.replace(/([<>\\])/g, "\\$1");
    // TODO: thumbnail credits (+ don't forget trim)

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(articleID, stage, timestamp,
                                    title, subtitle, language, category, authors, tags);
    const articleStyle = new ArticleStyle(req.body.hide_title_in_thumbnail, req.body.title_font, req.body.title_fill_style, req.body.title_color, req.body.title_fontsize_thumbnail, req.body.title_fontsize_article, req.body.title_fontweight, req.body.title_position, req.body.subtitle_font, req.body.subtitle_fontsize, req.body.subtitle_fontweight, req.body.subtitle_color, req.body.subtitle_position, req.body.dropcap)

    if (thumbnail && /^image/.test(thumbnail.mimetype)) {
        // it's not actually a png image, but who cares
        fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.png`, thumbnail.data);
    }

    article.contents = marked.parse(content).trim();
    await ejs.renderFile(__dirname + "/../views/article.ejs", {article, articleStyle}, async (err, res) => {
        if (err) {
            logger.error(err);
        } else {
            // the contents are also saved in markdown since it makes editing
            // the article a lot easier later; same as with those "articleStyle"
            // options
            fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`, res);
            fs.writeFileSync(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`, content);
            await queryDatabase.unindexArticle(article.id);
            await queryDatabase.indexArticle(article.id, content);
            articleDatabase.updateMetadata(article);
            articleDatabase.updateArticleStyles(article, articleStyle);
            await updateMainPage();
        }
    });

    res.redirect(`/articles/${article.id}`);
}

const post_updateArticleStage = async (req, res) => {
    const article = await articleDatabase.getArticleMeta(req.body.id);
    const originalStage = article.stage;
    article.failsafe_setStage(req.body.stage)
    fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.html`,
                   `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`)
    fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/${article.id}.md`,
                   `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`)
    fs.renameSync(`${ARTICLES_DIRECTORY}/${originalStage}/images/${article.id}.png`,
                   `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.png`)
    articleDatabase.updateArticleStage(article);
    await updateMainPage();
    res.redirect("/admin");
}

const post_adminRemoveArticle = async (req, res) => {
    let articleID = req.body.id;
    //(articlePublisher == req.user.id) {
        await articleDatabase.removeArticle(articleID)
        await queryDatabase.unindexArticle(articleID);
    //}
    res.redirect("/admin");
}

const get_adminPDFprintPage = async (_, res) => {
    res.render("pdfprints");
}

const post_adminAddPDFprintPage = async (req, res) => {
    let timestamp = new Date(req.body.date).getTime();
    let description = req.body.description;
    let pdffile = req.files ? req.files.pdffile : undefined;
    const pdfprint = new PDFPrint(timestamp, description);

    if (pdffile && /pdf$/.test(pdffile.mimetype)) {
        pdfprintDatabase.addPDFPrint(pdfprint);
        const pdffilepath = `${PDFPRINT_CONTENTS_PATH}/${pdfprint.filename}`;
        fs.writeFileSync(pdffilepath, pdffile.data);
        const thumbnail = (await pdf2img.convert(pdffile.data,
            conversion_config = {
                height: 750,
                page_numbers: [1],
            }))[0];
        fs.writeFileSync(`${PDFPRINT_THUMBNAILS_PATH}/${pdfprint.description}.png`, thumbnail);
        await updateMainPage();
        res.sendStatus(200);
    } else {
        res.sendStatus(500);
    }
}

module.exports = {
    get_mainPage,
    get_articlePage,
    get_adminPDFprintPage,
    post_adminAddArticle,
    post_adminRemoveArticle,
    post_adminAddPDFprintPage,
    post_updateArticleStage,
};

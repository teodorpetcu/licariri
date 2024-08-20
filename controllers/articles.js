const marked = require("marked");
const ejs = require("ejs");
const fs = require("fs");

const { logger } = require("../logger.js")

const { Author, Article, ArticleStyle } = require("../models/types.js");
const { ArticleDatabase } = require("../models/articles.js");
const { QueryDatabase } = require("../models/query.js");
const { PDFPrintsDatabase } = require("../models/pdf-prints.js");

const {
    ARTICLE_DATABASE_PATH,
    ARTICLE_CONTENTS_PATH,
    ARTICLE_IMAGES_PATH,
    QUERY_DATABASE_PATH,
    PDFPRINT_DATABASE_PATH,
} = require("../config.js");

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);
articleDatabase.init();

const queryDatabase = new QueryDatabase(QUERY_DATABASE_PATH);
queryDatabase.init();

const pdfprintDatabase = new PDFPrintsDatabase(PDFPRINT_DATABASE_PATH);
pdfprintDatabase.init();

const get_mainPage = async (_, res) => {
    // TODO: replace with prerendered page that updates every time a published
    // article is added, removed, or otherwise simply changes
    const pdfprints = await pdfprintDatabase.getAllPDFPrintsSorted();
    let articles = await articleDatabase.searchArticles();
    for (let i = 0; i < articles.length; i++) {
        articles[i].style = await articleDatabase.getArticleStyle(articles[i].id);
    }
    res.render("main", {articles, pdfprints});
}

const get_articlePage = async (req, res) => {
    const articleID = req.params.articleID;
    res.sendFile(`${ARTICLE_CONTENTS_PATH}/${articleID}.html`)
}

const post_adminAddArticle = async (req, res) => {
    const articleID = req.params.articleID;
    const originalArticle = await articleDatabase.getArticleMeta(articleID);

    const stage = originalArticle.stage;
    const timestamp = new Date(originalArticle.timestamp);
    const title = req.body.title;
    const subtitle = req.body.subtitle;
    const language = req.body.language;
    const category = req.body.category;
    const authors = Array.isArray(req.body["authors[]"])
                    ? req.body["authors[]"].map((a) => new Author(a))
                    : (typeof req.body["authors[]"] === "string"
                        ? [new Author(req.body["authors[]"])]
                        : []);
    const tags = Array.isArray(req.body["tags[]"])
                    ? req.body["tags[]"]
                    : (typeof req.body["tags[]"] === "string"
                        ? [req.body["tags[]"]]
                        : []);
    const content = req.body.content.replace(/([<>\\])/g, "\\$1");

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(articleID, stage, timestamp,
                                    title, subtitle, language, category, authors, tags);
    const articleStyle = new ArticleStyle(req.body.hide_title_in_thumbnail, req.body.title_font, req.body.title_fill_style, req.body.title_color, req.body.title_fontsize_thumbnail, req.body.title_fontsize_article, req.body.title_fontweight, req.body.title_position, req.body.subtitle_font, req.body.subtitle_fontsize, req.body.subtitle_fontweight, req.body.subtitle_color, req.body.subtitle_position, req.body.dropcap)

    if (thumbnail && /^image/.test(thumbnail.mimetype)) {
        fs.writeFileSync(`${ARTICLE_IMAGES_PATH}/${article.id}`, thumbnail.data);
    }

    article.contents = marked.parse(content).trim();
    await ejs.renderFile(__dirname + "/../views/article.ejs", {article, articleStyle}, async (err, res) => {
        if (err) {
            logger.error(err);
        } else {
            fs.writeFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.html`, res);
            fs.writeFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.md`, content);
            await queryDatabase.unindexArticle(article.id);
            await queryDatabase.indexArticle(article.id, content);
            articleDatabase.updateMetadata(article);
            articleDatabase.updateArticleStyles(article, articleStyle);
        }
    });

    res.redirect(`/articles/${article.id}`);
}

const post_adminRemoveArticle = async (req, res) => {
    let articleID = req.body.id;
    //(articlePublisher == req.user.id) {
        await articleDatabase.removeArticle(articleID)
        await queryDatabase.unindexArticle(articleID);
    //}
    res.redirect("/admin");
}

module.exports = {
    get_mainPage,
    get_articlePage,
    post_adminAddArticle,
    post_adminRemoveArticle,
};

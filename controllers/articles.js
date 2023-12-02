const marked = require("marked");
const fs = require("fs");

const { Author, Article } = require("../models/types.js");
const { ArticleDatabase } = require("../models/articles.js");
const { QueryDatabase } = require("../models/query.js");

const {
    ARTICLE_DATABASE_PATH,
    ARTICLE_CONTENTS_PATH,
    ARTICLE_IMAGES_PATH,
    MAIN_PAGE_ARTICLE_COUNT,
    QUERY_DATABASE_PATH,
} = require("../config.js");

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);
articleDatabase.init();

const queryDatabase = new QueryDatabase(QUERY_DATABASE_PATH);
queryDatabase.init();

const get_mainPage = async (req, res) => {
    let page = req.query.page ? req.query.page : 1;
    let articles = await articleDatabase.searchArticles();
    let articlePage = articles.slice(
            MAIN_PAGE_ARTICLE_COUNT * (page - 1),
            MAIN_PAGE_ARTICLE_COUNT * (page)
        );
    res.render("main", {articles: articlePage});
}

const get_articlePage = async (req, res) => {
    const articleID = req.params.articleID;
    const article = await articleDatabase.getArticle(articleID);
    const markdown = `${ARTICLE_CONTENTS_PATH}/${articleID}.md`
    fs.readFile(markdown, "utf8", (err, data) => {
        if (err) {
            // TODO: make a 404 page
            article.contents = "";
            res.render("article", {article});
        } else {
            article.contents = marked.parse(data.toString());
            res.render("article", {article});
        }
    })
}

const post_adminAddArticle = async (req, res) => {
    const title = req.body.title;
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
    const user_id = req.user.id;
    // Escape HTML tags and backslashes
    // NOTE: only article contents are interpreted as HTML by EJS, so only they
    // need to be sanitised
    //
    // However, this affects code blocks, where everything is interpreted
    // literally.
    const content = req.body.content.replace(/([<>\\])/g, "\\$1");

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(title, authors, tags, undefined, thumbnail ? true : false);

    // An article with this ID already exists; abort
    if (await articleDatabase.getArticleMeta(article.id)) {
        // TODO: maybe implement error checking client-side as well
        res.status(403).send(`<p>Un articol cu același titlu, publicat tot azi, există deja.</p><a href=\"/admin/modify/${article.id}\">Poate vrei să-l modifici?</a>`);
        return;
    }

    if (thumbnail && /^image/.test(thumbnail.mimetype)) {
        fs.writeFileSync(`${ARTICLE_IMAGES_PATH}/${article.id}`, thumbnail.data);
    }

    fs.writeFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.md`, content);
    queryDatabase.indexArticle(article.id, content);
    articleDatabase.saveArticle(article, user_id);

    res.redirect(`/articles/${article.id}`);
}

const get_adminListModifiableArticles = async (req, res) => {
    let articles = await articleDatabase.searchArticles("user", req.user.id);
    res.render("modify-article.ejs", {articles})
}

const get_adminModifyArticle = async (req, res) => {
    const articleID = req.params.articleID;
    let article = await articleDatabase.getArticle(articleID);
    article.content = fs.readFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.md`);
    res.render("add-or-modify-article", {action: `modify/${articleID}`, defaults: article});
}

const post_adminModifyArticle = async (req, res) => {
    const originalArticleID = req.params.articleID;
    let [originalArticle, articlePublisher] = await articleDatabase.getArticleMeta(originalArticleID);
    if (articlePublisher == req.user.id) {
        await articleDatabase.removeArticle(originalArticleID)
        await queryDatabase.unindexArticle(originalArticleID);
        if (!req.files && originalArticle.thumbnail) {
            req.files = {thumbnail: {
                mimetype: "image",
                // TODO: find a more efficient way to do this
                data: fs.readFileSync(`${ARTICLE_IMAGES_PATH}/${originalArticleID}`)
            }}
        }
        post_adminAddArticle(req, res);
    } else {
        res.redirect("/admin/modify");
    }
}

const get_adminRemoveArticle = async (req, res) => {
    let articles = await articleDatabase.searchArticles("user", req.user.id);
    res.render("remove-article.ejs", {articles});
}

const post_adminRemoveArticle = async (req, res) => {
    let articleID = req.body.id;
    let [_, articlePublisher] = await articleDatabase.getArticleMeta(articleID);
    if (articlePublisher == req.user.id) {
        await articleDatabase.removeArticle(articleID)
        await queryDatabase.unindexArticle(articleID);
    }
    res.redirect("/admin/remove");
}

module.exports = {
    get_mainPage,
    get_articlePage,
    post_adminAddArticle,
    get_adminRemoveArticle,
    post_adminRemoveArticle,
    get_adminListModifiableArticles,
    get_adminModifyArticle,
    post_adminModifyArticle,
};

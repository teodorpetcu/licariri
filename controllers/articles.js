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
    let articles = await articleDatabase.get_recent_articles(
        MAIN_PAGE_ARTICLE_COUNT * (page - 1),
        MAIN_PAGE_ARTICLE_COUNT * (page)
    );
    res.render("main", {articles})
}

const get_articlePage = async (req, res) => {
    const article_id = req.params.article_id;
    const article = await articleDatabase.search_article(article_id);
    const markdown = `${ARTICLE_CONTENTS_PATH}/${article_id}.md`
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
    const content = req.body.content.replace(/([<>\\])/g, "\\$1");

    let thumbnail = req.files ? req.files.thumbnail : undefined;

    const article = new Article(title, authors, tags, undefined, thumbnail ? true : false);

    if (thumbnail && /^image/.test(thumbnail.mimetype)) {
        fs.writeFileSync(`${ARTICLE_IMAGES_PATH}/${article.id}`, thumbnail.data);
    }

    fs.writeFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.md`, content);
    queryDatabase.indexArticle(article.id, content);
    articleDatabase.save_article(article, user_id);

    res.redirect(`/articles/${article.id}`);
}

const get_adminModifyArticle = async (req, res) => {
    let articles = await articleDatabase.search_articles_by_publisher(req.user.id);
    res.render("modify-article.ejs", {articles})
}

const get_adminModifyArticlePage = async (req, res) => {
    const article_id = req.params.article_id;
    let article = await articleDatabase.search_article(article_id);
    article.content = fs.readFileSync(`${ARTICLE_CONTENTS_PATH}/${article.id}.md`);
    res.render("add-or-modify-article", {action: `modify/${article_id}`, defaults: article});
}

const post_adminModifyArticle = async (req, res) => {
    const original_article_id = req.params.article_id;
    let article_publisher = await articleDatabase.get_article_publisher(original_article_id);
    if (article_publisher == req.user.id) {
        await articleDatabase.remove_article(original_article_id)
        await queryDatabase.unindex(original_article_id);
        if (!req.files) {
            req.files = {thumbnail: {
                mimetype: "image",
                // TODO: find a more efficient way to do this
                data: fs.readFileSync(`${ARTICLE_IMAGES_PATH}/${original_article_id}`)
            }}
        }
        post_adminAddArticle(req, res);
    } else {
        res.redirect("/admin/modify");
    }
}

const get_adminRemoveArticle = async (req, res) => {
    let articles = await articleDatabase.search_articles_by_publisher(req.user.id);
    res.render("remove-article.ejs", {articles});
}

const post_adminRemoveArticle = async (req, res) => {
    let article_id = req.body.id;
    let article_publisher = await articleDatabase.get_article_publisher(article_id);
    if (article_publisher == req.user.id) {
        await articleDatabase.remove_article(article_id)
        await queryDatabase.unindex(article_id);
    }
    res.redirect("/admin/remove");
}

module.exports = {
    get_mainPage,
    get_articlePage,
    post_adminAddArticle,
    get_adminRemoveArticle,
    post_adminRemoveArticle,
    get_adminModifyArticle,
    get_adminModifyArticlePage,
    post_adminModifyArticle,
};

const { QueryDatabase } = require("../models/query.js");
const { ArticleDatabase } = require("../models/articles.js");

const {
    ARTICLE_DATABASE_PATH,
    QUERY_DATABASE_PATH,
} = require("../config.js");

const queryDatabase = new QueryDatabase(QUERY_DATABASE_PATH);
queryDatabase.init();

const articleDatabase = new ArticleDatabase(ARTICLE_DATABASE_PATH);
articleDatabase.init();

const get_queryPage = async (req, res) => {
    let articleIDs = [];
    let searchResults = [];

    let any = req.query.any;
    let author = req.query.author;
    let tag = req.query.tag;
    let text = req.query.text;
    let exactMatch = true;
    let successMessage = "Rezultatele căutării:";
    let failureMessage = "Ne pare rău, nu am putut găsi nimic!";

    if (any) {
        message = `Rezultatele căutării pentru: ${any}`;
        failureMessage = `Ne pare rău, nu am putut găsi nimic pentru: ${any}`;
        author = any;
        tag = any;
        text = any;
        exactMatch = false;
        articleIDs = articleIDs.concat(await articleDatabase.searchArticleIDs("title", any, exactMatch));
    }
    // NOTE: if the `any` flag is NOT specified, then we return the articles
    // that match ALL of the provided criteria
    //
    // It's probably more efficient to filter-search at the database level, but
    // for the moment this implementation should *hopefully* not break,
    // performance-wise
    //
    // Overall, the most efficient way to handle this would be to do all this
    // client-side, since if there would be a frontend interface to properly
    // handle this it would be ideal if the page wouldn't refresh every time.

    if (author) {
        let foundArticleIDs = await articleDatabase.searchArticleIDs("author", author, exactMatch);
        if (any || !articleIDs.length) {
            articleIDs = articleIDs.concat(foundArticleIDs);
        } else {
            articleIDs = articleIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!tag && !text) {
            successMessage = `Articole scrise de ${author}:`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol scris de ${author}`;
        }
    }
    if (tag) {
        let foundArticleIDs = await articleDatabase.searchArticleIDs("tag", tag, exactMatch);
        if (any || !articleIDs.length) {
            articleIDs = articleIDs.concat(foundArticleIDs);
        } else {
            articleIDs = articleIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!author && !text) {
            successMessage = `Articole cu tag-ul #${tag}:`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol cu tag-ul #${tag}`;
        }
    }
    if (text) {
        let foundArticleIDs = await queryDatabase.findArticles(text);
        if (any || !articleIDs.length) {
            articleIDs = articleIDs.concat(foundArticleIDs);
        } else {
            articleIDs = articleIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!author && !tag) {
            successMessage = `Articole ce conțin «${text}»`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol care să conțină «${text}»`;
        }
    }

    articleIDs = [... new Set(articleIDs)];

    searchResults = await Promise.all(articleIDs.map(async (id) => articleDatabase.getArticle(id)));

    res.render("query", {articles: searchResults, successMessage, failureMessage});
}

module.exports = {
    get_queryPage,
};

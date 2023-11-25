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
    // TODO: maybe send the data to the client and do the searching client-side somehow?
    // or, you know, write a proper API to handle querying.
    let searchResultsIDs = [];
    let searchResults = [];

    let author = req.query.author;
    let tag = req.query.tag;
    let text = req.query.text;

    if (author) {
        searchResultsIDs = searchResultsIDs.concat(await articleDatabase.search_articles_by_author(author));
    }
    if (tag) {
        searchResultsIDs = searchResultsIDs.concat(await articleDatabase.search_articles_by_tag(tag));
    }
    if (text) {
        searchResultsIDs = searchResultsIDs.concat(await queryDatabase.findArticles(text));
    }

    searchResults = await Promise.all(searchResultsIDs.map(async (id) => await articleDatabase.search_article(id)));

    res.render("query", {articles: searchResults});
}

module.exports = {
    get_queryPage,
};

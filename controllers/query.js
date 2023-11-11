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
    let text = req.query.text;
    let searchResultsIDs = await queryDatabase.findArticles(text);
    let searchResults = await Promise.all(searchResultsIDs.map(async (id) => await articleDatabase.search_article(id)));
    res.render("query", {articles: searchResults});
}

module.exports = {
    get_queryPage,
};

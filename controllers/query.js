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
    let searchResultsIDs = [];
    let searchResults = [];

    let any = req.query.any;
    let author = req.query.author;
    let tag = req.query.tag;
    let text = req.query.text;
    let success_message = "Rezultatele căutării:";
    let failure_message = "Ne pare rău, nu am putut găsi nimic!";

    if (any) {
        message = `Rezultatele căutării pentru: ${any}`;
        failure_message = `Ne pare rău, nu am putut găsi nimic pentru: ${any}`;
        author = any;
        tag = any;
        text = any;
        searchResultsIDs = searchResultsIDs.concat(await articleDatabase.search_articles_by_title(any));
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
        let foundArticleIDs = await articleDatabase.search_articles_by_author(author);
        if (any || !searchResultsIDs.length) {
            searchResultsIDs = searchResultsIDs.concat(foundArticleIDs);
        } else {
            searchResultsIDs = searchResultsIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!tag && !text) {
            success_message = `Articole scrise de ${author}:`;
            failure_message = `Ne pare rău, nu am putut găsi nici un articol scris de ${author}`;
        }
    }
    if (tag) {
        let foundArticleIDs = await articleDatabase.search_articles_by_tag(tag);
        if (any || !searchResultsIDs.length) {
            searchResultsIDs = searchResultsIDs.concat(foundArticleIDs);
        } else {
            searchResultsIDs = searchResultsIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!author && !text) {
            success_message = `Articole cu tag-ul #${tag}:`;
            failure_message = `Ne pare rău, nu am putut găsi nici un articol cu tag-ul #${tag}`;
        }
    }
    if (text) {
        let foundArticleIDs = await queryDatabase.findArticles(text);
        if (any || !searchResultsIDs.length) {
            searchResultsIDs = searchResultsIDs.concat(foundArticleIDs);
        } else {
            searchResultsIDs = searchResultsIDs.filter((id) => foundArticleIDs.includes(id));
        }
        if (!author && !tag) {
            success_message = `Articole ce conțin «${text}»`;
            failure_message = `Ne pare rău, nu am putut găsi nici un articol care să conțină «${text}»`;
        }
    }

    searchResultsIDs = [... new Set(searchResultsIDs)];

    searchResults = await Promise.all(searchResultsIDs.map(async (id) => await articleDatabase.search_article(id)));

    res.render("query", {articles: searchResults, success_message, failure_message});
}

module.exports = {
    get_queryPage,
};

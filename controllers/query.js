const ejs = require("ejs");
const fs = require("fs");

const { fileExists } = require("../util.js");
const { errorLogger } = require("../logger.js")
const { queryDatabase } = require("../models/query.js");
const { articleDatabase } = require("../models/articles.js");
const { QUERY_PRERENDERS } = require("../config.js");

/**
 * @param {Obj} query
 * @returns {Promise<string>}
 */
const renderQueryPage = async (query) => {
    let articleIDs = [];
    let searchResults = [];

    let any = query.any;
    let author = query.author;
    let tag = query.tag;
    let text = query.text;
    let exactMatch = true;
    let message = "";
    let successMessage = "";
    let failureMessage = "";
    let searchPageTitle = "Căutare - Revista Licăriri";

    let titlePromise = Promise.resolve([]);
    let authorPromise = Promise.resolve([]);
    let tagPromise = Promise.resolve([]);
    let textPromise = Promise.resolve([]);

    if (any) {
        failureMessage = `Ne pare rău, nu am putut găsi nimic pentru «${any}»:`;
        successMessage = `Rezultatele căutării pentru «${any}»:`;
        searchPageTitle = `Căutare: ${any} - Revista Licăriri`
        author = any;
        tag = any;
        text = any;
        exactMatch = false;
        titlePromise = articleDatabase.searchArticleIDs("title", any, exactMatch);
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
        authorPromise = articleDatabase.searchArticleIDs("author", author, exactMatch);
        if (!tag && !text) {
            successMessage = `Articole scrise de ${author}:`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol scris de ${author}`;
            searchPageTitle = `Autor: ${author} - Revista Licăriri`;
        }
    }
    if (tag) {
        tagPromise = articleDatabase.searchArticleIDs("tag", tag, exactMatch);
        if (!author && !text) {
            successMessage = `Articole cu tag-ul #${tag}:`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol cu tag-ul #${tag}`;
            searchPageTitle = `Tag: #${tag} - Revista Licăriri`;
        }
    }
    if (text) {
        textPromise = queryDatabase.findArticles(text);
        if (!author && !tag) {
            successMessage = `Articole ce conțin «${text}»`;
            failureMessage = `Ne pare rău, nu am putut găsi nici un articol care să conțină «${text}»`;
            searchPageTitle = `Căutare: ${text} - Revista Licăriri`
        }
    }

    // using Promise.all() is potentially much faster than using `await` on each
    // of them individually
    let subqueries = await Promise.all([
        titlePromise,
        authorPromise,
        tagPromise,
        textPromise,
    ]);
    articleIDs = [... new Set(subqueries.flat(1))];

    if (! any) {
        for (subquery of subqueries) {
            if (subquery.length) {
                articleIDs = articleIDs.filter(id => subquery.includes(id));
            }
        }
    }

    searchResults = await Promise.all(articleIDs.map((id) => articleDatabase.getArticle(id)));
    searchResults = searchResults.filter(x => x); // in case of any `undefined`
    for (let i = 0; i < searchResults.length; i++) {
        if (searchResults[i] != undefined) {
            searchResults[i].style = await articleDatabase.getArticleStyle(searchResults[i].id);
        }
    }
    searchResults.sort((a,b) => b.timestamp - a.timestamp);

    if (searchResults.length) {
        message = successMessage;
    } else {
        message = failureMessage;
    }

    return ejs.renderFile(__dirname + "/../views/query.ejs",
        {articles: searchResults, searchPageTitle, message},
        {async: true})
        .catch(this.errorLogger);
}

const get_queryPage = async (req, res) => {
    if (req.query.author && !req.query.tag && !req.query.any && !req.query.text) {
        if (await fileExists(QUERY_PRERENDERS + `/author=${req.query.author}.html`)) {
            res.sendFile(QUERY_PRERENDERS + `/author=${req.query.author}.html`);
            return;
        }
    } else if (req.query.tag && !req.query.author && !req.query.any && !req.query.text) {
        if (await fileExists(QUERY_PRERENDERS + `/tag=${req.query.tag}.html`)) {
            res.sendFile(QUERY_PRERENDERS + `/tag=${req.query.tag}.html`);
            return;
        }
    }
    const queryPage = await renderQueryPage(req.query);
    res.send(queryPage);
}

/**
 * @param {Object} query
 * @returns {Promise<boolean>}
 */
const prerenderQueryAsFile = async (query) => {
    let filename = "";
    if (query.author && !query.tag && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/author=${query.author}.html`;
    } if (query.tag && !query.author && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/tag=${query.tag}.html`
    }

    if (filename) {
        const queryPage = await renderQueryPage(query);
        return fs.promises.writeFile(filename, queryPage)
            .then(() => true)
            .catch(errorLogger);
    } else {
        return Promise.resolve(false);
    }
}

module.exports = {
    get_queryPage,
    prerenderQueryAsFile,
};

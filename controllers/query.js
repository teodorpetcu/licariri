const ejs = require("ejs");
const fs = require("fs");

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

    if (any) {
        failureMessage = `Ne pare rău, nu am putut găsi nimic pentru «${any}»:`;
        successMessage = `Rezultatele căutării pentru «${any}»:`;
        searchPageTitle = `Căutare: ${any} - Revista Licăriri`
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
            searchPageTitle = `Autor: ${author} - Revista Licăriri`;
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
            searchPageTitle = `Tag: #${tag} - Revista Licăriri`;
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
            searchPageTitle = `Căutare: ${text} - Revista Licăriri`
        }
    }

    articleIDs = [... new Set(articleIDs)];

    searchResults = await Promise.all(articleIDs.map(async (id) => articleDatabase.getArticle(id)))
    for (let i = 0; i < searchResults.length; i++) {
        searchResults[i].style = await articleDatabase.getArticleStyle(searchResults[i].id);
    }
    searchResults.sort((a,b) => b.timestamp - a.timestamp);

    if (searchResults.length) {
        message = successMessage;
    } else {
        message = failureMessage;
    }

    return new Promise((resolve) => {
        ejs.renderFile(__dirname + "/../views/query.ejs",
                {articles: searchResults, searchPageTitle, message},
                (err, res) => {
                    if (err) {
                        logger.error(err);
                        resolve("");
                } else {
                    resolve(res);
                }
                }
            )
    })
}

const get_queryPage = async (req, res) => {
    if (req.query.author && !req.query.tag && !req.query.any && !req.query.text) {
        // TODO: pre-render query pages more wisely
        await prerenderQueryAsFile(req.query);
        res.sendFile(QUERY_PRERENDERS + `/author=${req.query.author}.html`);
    } else if (req.query.tag && !req.query.author && !req.query.any && !req.query.text) {
        await prerenderQueryAsFile(req.query);
        res.sendFile(QUERY_PRERENDERS + `/tag=${req.query.tag}.html`);
    } else {
        const queryPage = await renderQueryPage(req.query);
        res.send(queryPage);
    }
}

const prerenderQueryAsFile = async (query) => {
    let filename = "";
    if (query.author && !query.tag && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/author=${query.author}.html`;
    } if (query.tag && !query.author && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/tag=${query.tag}.html`
    }
    if (filename) {
        const queryPage = await renderQueryPage(query);
        fs.writeFileSync(filename, queryPage);
    }
}

module.exports = {
    get_queryPage,
};

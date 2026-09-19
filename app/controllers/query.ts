// Copyright (C) 2026  Teodor Petcu  <petcuteodor03@gmail.com>
// This file is part of licariri.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import ejs from "ejs";
import { type Request, type Response } from "express";

import { type Article } from "../models/types.ts";
import { fileExists, writeFile } from "../utils/util.ts";
import { logger } from "../services/logger.ts";
import queryDatabase from "../models/query.ts";
import articleDatabase  from "../models/articles.ts";
import { QUERY_PRERENDERS } from "../config.ts";

type QueryParams = {
    any?: string,
    tag?: string,
    author?: string,
    text?: string,
    exactMatch?: boolean,
}

const renderQueryPage = async (query: QueryParams) => {
    let articleIDs = [];
    let searchResults = [];

    const any = query.any;
    let author = query.author;
    let tag = query.tag;
    let text = query.text;
    let exactMatch = true;
    let message = "";
    let successMessage = "";
    let failureMessage = "";
    let searchPageTitle = "Căutare - Revista Licăriri";

    let titlePromise;
    let authorPromise
    let tagPromise;
    let textPromise;

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
    const subqueries = await Promise.all([
        titlePromise,
        authorPromise,
        tagPromise,
        textPromise,
    ]);
    articleIDs = [... new Set(subqueries.flat(1))];

    if (! any) {
        for (const subquery of subqueries) {
            if (subquery?.length) {
                articleIDs = articleIDs.filter(id => subquery.includes(id!));
            }
        }
    }

    searchResults = await Promise.all(articleIDs.map((id) => articleDatabase.getArticle(id!)));
    searchResults = searchResults.filter(x => x); // in case of any `undefined`
    searchResults.sort((a,b) => b!.timestamp - a!.timestamp);

    if (searchResults.length) {
        message = successMessage;
    } else {
        message = failureMessage;
    }

    return ejs.renderFile(import.meta.dirname + "/../views/query.ejs",
        {articles: searchResults, searchPageTitle, message},
        {async: true})
        .catch((err: Error) => logger.error(err, "rendering query page"));
}

export const get_queryPage = async (req: Request, res: Response) => {
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

export const prerenderQueryAsFile = async (query: QueryParams) => {
    let filename = "";
    if (query.author && !query.tag && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/author=${query.author}.html`;
    } if (query.tag && !query.author && !query.any && !query.text) {
        filename = QUERY_PRERENDERS + `/tag=${query.tag}.html`
    }

    if (filename) {
        return await renderQueryPage(query)
            .then((queryPage) => writeFile(filename, queryPage))
            .then(() => true)
            .catch((err) => logger.error(err, "writing prerendered query page file"));
    } else {
        return await Promise.resolve(false);
    }
}

export const prerenderQueryFilesForArticle = async (article: Article) => {
    return await Promise.all([
        prerenderQueryAuthorsMentionedInArticle(article),
        prerenderQueryTagsMentionedInArticle(article),
    ]);
}

const prerenderQueryAuthorsMentionedInArticle = async (article: Article) => {
    return await Promise.all(article.authors.map(author => prerenderQueryAsFile({author: author})));
}

const prerenderQueryTagsMentionedInArticle = async (article: Article) => {
    return await Promise.all(article.tags.map(tag => prerenderQueryAsFile({tag: tag})));
}

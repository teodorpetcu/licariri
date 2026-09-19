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

import { type ArticleMeta } from "../models/types.ts";
import { logger } from "./logger.ts";
import { formatDate, writeFile } from "../utils/util.ts";
import { WEBSITE_URL, SITEMAP_FILE_PATH } from "../config.ts";
import articleDatabase from "../models/articles.ts";
import usersDatabase from "../models/admin.ts";

const escapeStringForXML = (str: string): string => {
    return str.replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("'", "&apos;")
                .replaceAll("\"", "&quot;")
                .replaceAll(" ", "%20");
}

const generateSitemapFile = async (): Promise<void> => {
    await Promise.all([
        articleDatabase.open(),
        usersDatabase.open(),
    ])
    const [articles, magazines] = await Promise.all([
        articleDatabase.searchArticles("stage", "public"),
        articleDatabase.getAllMagazinesSorted(),
    ])

    let sitemapXML =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${WEBSITE_URL}/</loc>
        <priority>1</priority>
        <changefreq>weekly</changefreq>
    </url>`

    // TODO: add other main pages here when the time comes

    // populate every article with a `lastmod` property
    await Promise.all(articles.map(async (article: ArticleMeta) => {
        return await usersDatabase.getArticleModifications(article.id)
            .then((activities) => {
                if (activities.length) {
                    article.lastmod = activities[0].timestamp;
                }
            })
            .catch((err) => logger.error(err, "getting article modifications for sitemap"));
    }))

    for (const article of articles) {
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/articles/${escapeStringForXML(article.id)}</loc>
        <lastmod>${formatDate(article.lastmod ?? article.timestamp)}</lastmod>
        <priority>0.7</priority>
        <changefreq>yearly</changefreq>
    </url>`
    }

    for (const magazine of magazines) {
        let date;
        if (magazine.timestamp >= 946684800) { // year 2000 in unix time
            date = new Date(magazine.timestamp);
        } else { // old magazines, from the communist period
            date = new Date("2025-06-29")
        }
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/magazines/${escapeStringForXML(magazine.filename)}</loc>
        <lastmod>${formatDate(date)}</lastmod>
        <changefreq>never</changefreq>
    </url>`
    }
    sitemapXML += `\n</urlset>`

    return writeFile(SITEMAP_FILE_PATH, sitemapXML)
        .then(() => {
            logger.info("updated sitemap.xml")
        })
        .catch((err) => {
            logger.error(err, "writing sitemap.xml file");
            return Promise.reject();
        });
}

export default generateSitemapFile;

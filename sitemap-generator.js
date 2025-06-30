const fs = require("fs");

const { logger } = require("./logger.js");
const { formatDate } = require("./util.js");
const { WEBSITE_URL, SITEMAP_FILE_PATH } = require("./config.js");
const { articleDatabase } = require("./models/articles.js");
const { usersDatabase } = require("./models/admin.js");

const escapeStringForXML = (str) => {
    return str.replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll("'", "&apos;")
                .replaceAll("\"", "&quot;")
                .replaceAll(" ", "%20");
}

const generateSitemapFile = async () => {
    await Promise.all([
        articleDatabase.open(),
        usersDatabase.open(),
    ])
    let [articles, magazines] = await Promise.all([
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
    await Promise.all(articles.map(async (article) => {
        article.lastmod = article.timestamp;
        return usersDatabase.getArticleModifications(article.id)
            .then((activities) => {
                if (activities.length) {
                    article.lastmod = activities[0].timestamp;
                }
            })
            .catch((err) => logger.error(`getting article modifications for sitemap`, err));
    }))

    for (let article of articles) {
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/articles/${escapeStringForXML(article.id)}</loc>
        <lastmod>${formatDate(new Date(article.lastmod))}</lastmod>
        <priority>0.7</priority>
        <changefreq>yearly</changefreq>
    </url>`
    }

    for (let magazine of magazines) {
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

    return fs.promises.writeFile(SITEMAP_FILE_PATH, sitemapXML, { encoding: "utf-8" })
        .then(() => logger.info("updated sitemap.xml"))
        .catch((err) => logger.error(`writing sitemap.xml file`, err));
}

module.exports = {
    generateSitemapFile,
};

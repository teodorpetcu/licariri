const fs = require("fs");

const { logger } = require("./logger.js");
const { WEBSITE_URL, SITEMAP_FILE_PATH } = require("./config.js");
const { articleDatabase } = require("./models/articles.js");
const { usersDatabase } = require("./models/admin.js");
const { formatDate } = require("./models/types.js");

const generateSitemapFile = async () => {
    const articles = await articleDatabase.searchArticles();
    const pdfprints = await articleDatabase.getAllPDFPrintsSorted();

    const escapeStringForXML = (str) => {
        return str.replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll("'", "&apos;")
                    .replaceAll("\"", "&quot;")
                    .replaceAll(" ", "%20");
    }

    let sitemapXML =
`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
    <url>
        <loc>${WEBSITE_URL}/</loc>
        <priority>1</priority>
        <changefreq>weekly</changefreq>
    </url>`

    // TODO: add other main pages here when the time comes

    for (let article of articles) {
        // the article may have been edited after it had been published
        let lastmod = article.timestamp;
        let activities = await usersDatabase.getArticleModifications(article.id);
        if (activities.length) lastmod = activities[0].timestamp;
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/articles/${escapeStringForXML(article.id)}</loc>
        <lastmod>${formatDate(new Date(lastmod))}</lastmod>
        <priority>0.7</priority>
        <changefreq>yearly</changefreq>
    </url>`
    }

    for (let pdfprint of pdfprints) {
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/pdfprints/${escapeStringForXML(pdfprint.filename)}</loc>
        <lastmod>${formatDate(new Date(pdfprint.timestamp))}</lastmod>
        <changefreq>never</changefreq>
    </url>`
    }
    sitemapXML += `\n</urlset>`

    fs.writeFileSync(SITEMAP_FILE_PATH, sitemapXML, { encoding: "utf-8" });
    logger.info("sitemap updated")
    return;
}

generateSitemapFile();

module.exports = {
    generateSitemapFile,
};

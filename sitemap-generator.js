const fs = require("fs");

const { WEBSITE_URL } = require("./config.js");
const { articleDatabase } = require("./models/articles.js");
const { formatDate } = require("./models/types.js");

const generateSitemapFile = async () => {
    const articles = await articleDatabase.searchArticles();
    const pdfprints = await articleDatabase.getAllPDFPrintsSorted();

    const escapeStringForXML = (str) => {
        return str.replaceAll("&", "&amp;")
                    .replaceAll("<", "&lt;")
                    .replaceAll(">", "&gt;")
                    .replaceAll("'", "&apos;")
                    .replaceAll("\"", "&quot;");
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

    articles.forEach((article) => {
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/articles/${escapeStringForXML(article.id)}</loc>
        <lastmod>${formatDate(new Date(article.timestamp))}</lastmod>
        <priority>0.7</priority>
        <changefreq>yearly</changefreq>
    </url>`
    })

    pdfprints.forEach((pdfprint) => {
    sitemapXML += `
    <url>
        <loc>${WEBSITE_URL}/pdfprints/${escapeStringForXML(pdfprint.filename)}</loc>
        <lastmod>${formatDate(new Date(pdfprint.timestamp))}</lastmod>
        <changefreq>never</changefreq>
    </url>`
    })
    sitemapXML += `\n</urlset>`

    fs.writeFileSync(__dirname + "/sitemap.xml", sitemapXML, { encoding: "utf-8" });
    return;
}

module.exports = {
    generateSitemapFile,
};

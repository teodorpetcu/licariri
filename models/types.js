/**
 * @param {Date} date - Date to format
 * @returns {string} - Date formatted YYYY-MM-DD
 */
const formatDate = (date) => {
    let yyyy = date.getFullYear();
    let mm = date.getMonth() + 1; if (mm < 10) mm = `0${mm}`;
    let dd = date.getDate(); if (dd < 10) dd = `0${dd}`;
    return `${yyyy}-${mm}-${dd}`;
}

class Author {
    /**
     * @param {string} name
     */
    constructor(name) {
        this.name = name;
    }
}

class Article {
    /**
     * @param {string} title
     * @param {Author[]} authors
     * @param {string[]} tags
     * @param {Date} date
     * @param {boolean} thumbnail
     */
    constructor(title, authors, tags, timestamp = new Date(), thumbnail = false) {
        this.title = title;
        this.authors = authors;
        this.tags = tags;
        this.timestamp = timestamp.valueOf();
        this.thumbnail = thumbnail;
        this.date = formatDate(timestamp);
        this.id = this.articleID();
    }

    /**
     * @returns {string} ID of the article
     */
    articleID() {
        return (this.date + "-" + this.title.toLowerCase().replace(/[ \t\n]/g, "-"))
            .replace(/[\?&\/\\]/g, "");
    }
}

module.exports = {
    Author,
    Article,
};

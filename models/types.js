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
     * Information used to identify an author
     * @param {string} name
     * @param {string} occupation
     */
    constructor(name, occupation = "") {
        this.name = name;
        this.occupation = occupation;
    }
}

class Article {
    /**
     * Metadata related to an article
     * @param {string} title
     * @param {string} date
     * @param {string} authors
     * @param {string} tags
     */
    constructor(title, authors, tags, timestamp = new Date()) {
        this.title = title;
        this.authors = authors;
        this.tags = tags;
        this.timestamp = timestamp.valueOf();
        this.date = formatDate(timestamp);
        this.id = this.article_id();
    }

    /**
     * @returns {string} ID of the article
     */
    article_id() {
        return (this.date + "-" + this.title.toLowerCase().replace(/[ \t\n]/g, "-"))
            .replace(/[\?&\/\\]/g, "");
    }
}

module.exports = {
    Author,
    Article,
};

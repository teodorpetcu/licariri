const crypto = require("crypto");

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
     * @param {string} id
     * @param {string} stage
     * @param {Date} timestamp
     * @param {string} title
     * @param {string} subtitle
     * @param {string} language
     * @param {string} category
     * @param {Author[]} authors
     * @param {string[]} tags
     */
    constructor(id = undefined, stage = "", timestamp = new Date(),
                title, subtitle, language = "", category,
                authors = [], tags = []) {
        if (! ["draft"].includes(stage)) stage = "draft";
        if (! ["ro"].includes(language.toLowerCase())) language = "ro";

        if (id) {
            this.id = id;
        } else {
            this.id = crypto.randomUUID();
        }
        this.stage = stage;
        this.timestamp = timestamp.valueOf();
        this.date = formatDate(timestamp);
        this.title = title;
        this.subtitle = subtitle;
        this.language = language;
        this.category = category;
        this.authors = authors;
        this.tags = tags;
    }
}

module.exports = {
    Author,
    Article,
};

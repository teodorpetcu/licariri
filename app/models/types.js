const { formatDate } = require("../utils/util.js");

/**
 * @params {string} title
 * @returns {string}
 */
generateArticleID = (title) => {
    return title.toLowerCase().replaceAll(/[,.?*!:;"'<>]/g, "").replaceAll(/\s/g, "-");
}


class Article {
    /**
     * NOTE: the ID is inferrable from the title
     * @param {Object} obj
     * @param {string} obj.stage
     * @param {Date} obj.timestamp
     * @param {string} obj.title
     * @param {string} obj.subtitle
     * @param {string} obj.language
     * @param {string} obj.category
     * @param {string} obj.descripion
     * @param {string[]} obj.authors
     * @param {string[]} obj.tags
     */
    constructor({stage, timestamp = new Date(), title, subtitle, language = "", category, description, authors = [], tags = []}) {
        language = language.toLowerCase();
        if (! ["ro", "en", "fr", "de"].includes(language)) language = "ro";

        this.id = generateArticleID(title)
        this.timestamp = timestamp.valueOf();
        this.stage = stage;
        this.date = formatDate(timestamp);
        this.title = title;
        this.subtitle = subtitle;
        this.language = language;
        this.category = category;
        this.description = description;
        this.authors = authors;
        this.tags = tags;

        this.failsafe_setStage(stage);
    }

    /**
     * Using this function, ensure that no invalid value gets set
     * @param {string} stage
     */
    failsafe_setStage = (stage) => {
        if (! ["public", "draft", "trash"].includes(stage)) stage = "draft";
        this.stage = stage;
    }
}

class ArticleStyle {
    /**
     * @param {Object} obj
     * @param {number} obj.hideTitleInThumbnail
     * @param {number} obj.title
     * @param {string} obj.title.font
     * @param {string} obj.title.color
     * @param {string} obj.title.position
     * @param {string} obj.title.fontsizeArticle
     * @param {string} obj.title.fontsizeThumbnail
     * @param {string} obj.title.fontweight
     * @param {string} obj.subtitle
     * @param {string} obj.subtitle.font
     * @param {string} obj.subtitle.color
     * @param {string} obj.subtitle.position
     * @param {string} obj.subtitle.fontsize
     * @param {string} obj.subtitle.fontweight
     * @param {string} obj.article
     * @param {string} obj.article.firstLetter
     */
    constructor({hideTitleInThumbnail, title, subtitle, article}) {
        this.hideTitleInThumbnail = hideTitleInThumbnail;
        this.title = title;
        this.subtitle = subtitle;
        this.article = article;
    }
}

class Magazine {
    /**
     * @param {int} timestamp
     * @param {string} description
     */
    constructor(timestamp, description) {
        this.timestamp = timestamp;
        this.date = formatDate(timestamp);
        this.description = description;
        this.filename = description + ".pdf";
    }
}

module.exports = {
    generateArticleID,
    Article,
    ArticleStyle,
    Magazine,
};

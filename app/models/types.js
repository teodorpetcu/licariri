const { formatDate } = require("../utils/util.js");

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
     * NOTE: the ID is inferrable from the title
     * @param {Object} obj
     * @param {string} obj.stage
     * @param {Date} obj.timestamp
     * @param {string} obj.title
     * @param {string} obj.subtitle
     * @param {string} obj.language
     * @param {string} obj.category
     * @param {string} obj.descripion
     * @param {Author[]} obj.authors
     * @param {string[]} obj.tags
     */
    constructor({stage, timestamp = new Date(), title, subtitle, language = "", category, description, authors = [], tags = []}) {
        language = language.toLowerCase();
        if (! ["ro", "en", "fr", "de"].includes(language)) language = "ro";

        this.id = title.toLowerCase().replaceAll(/[,.?*!:;"'<>]/g, "").replaceAll(/\s/g, "-");
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
     * @param {number} obj.hide_title_in_thumbnail
     * @param {string} obj.title_font
     * @param {string} obj.title_fill_style
     * @param {string} obj.title_color
     * @param {number} obj.title_fontsize_thumbnail
     * @param {number} obj.title_fontsize_article
     * @param {number} obj.title_fontweight
     * @param {string} obj.title_position
     * @param {string} obj.subtitle_font
     * @param {number} obj.subtitle_fontsize
     * @param {number} obj.subtitle_fontweight
     * @param {string} obj.subtitle_position
     * @param {string} obj.dropcap
     */
    constructor({hide_title_in_thumbnail, title_font, title_fill_style, title_color, title_fontsize_thumbnail, title_fontsize_article, title_fontweight, title_position, subtitle_font, subtitle_fontsize, subtitle_fontweight, subtitle_color, subtitle_position, dropcap}) {
        this.hide_title_in_thumbnail  = hide_title_in_thumbnail;
        this.title_font               = title_font;
        this.title_fill_style         = title_fill_style
        this.title_color              = title_color;
        this.title_fontsize_thumbnail = title_fontsize_thumbnail;
        this.title_fontsize_article   = title_fontsize_article;
        this.title_fontweight         = title_fontweight;
        this.title_position           = title_position;
        this.subtitle_font            = subtitle_font;
        this.subtitle_fontsize        = subtitle_fontsize;
        this.subtitle_fontweight      = subtitle_fontweight;
        this.subtitle_color           = subtitle_color;
        this.subtitle_position        = subtitle_position;
        this.dropcap                  = dropcap;
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
    Author,
    Article,
    ArticleStyle,
    Magazine,
};

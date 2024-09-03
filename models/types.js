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
     * NOTE: the ID is inferrable from the title
     * @param {string} stage
     * @param {Date} timestamp
     * @param {string} title
     * @param {string} subtitle
     * @param {string} language
     * @param {string} category
     * @param {string} descripion
     * @param {Author[]} authors
     * @param {string[]} tags
     */
    constructor(stage = "", timestamp = new Date(),
                title, subtitle, language = "", category, description,
                authors = [], tags = []) {
        language = language.toLowerCase();
        if (! ["ro", "en", "fr", "de"].includes(language)) language = "ro";

        this.id = title.toLowerCase().replaceAll(/[,.?*!]/g, "").replaceAll(/\s/g, "-");
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
     * @param {int} hide_title_in_thumbnail
     * @param {string} title_font
     * @param {string} title_fill_style
     * @param {string} title_color
     * @param {int} title_fontsize_thumbnail
     * @param {int} title_fontsize_article
     * @param {int} title_fontweight
     * @param {string} title_position
     * @param {string} subtitle_font
     * @param {int} subtitle_fontsize
     * @param {int} subtitle_fontweight
     * @param {string} subtitle_position
     * @param {string} subtitle_position
     * @param {string} dropcap
     */
    constructor(hide_title_in_thumbnail, title_font, title_fill_style, title_color, title_fontsize_thumbnail, title_fontsize_article, title_fontweight, title_position, subtitle_font, subtitle_fontsize, subtitle_fontweight, subtitle_color, subtitle_position, dropcap) {
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

class PDFPrint {
    /**
     * @param {int} timestamp
     * @param {string} description
     */
    constructor(timestamp, description) {
        this.timestamp = timestamp;
        this.description = description;
        this.filename = description + ".pdf";
    }
}

module.exports = {
    formatDate,
    Author,
    Article,
    ArticleStyle,
    PDFPrint,
};

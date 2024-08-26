const fs = require("fs");

const APPDATA_DIR = __dirname + "/appdata"
const DATABASES_DIRECTORY = APPDATA_DIR + "/databases",

CONFIG = {
    LISTENING_PORT: 8000,
    LOG_FILE_PATH: APPDATA_DIR + "/runtime.log",
    ARTICLE_DATABASE_PATH: DATABASES_DIRECTORY + "/articles.sql",
    USERS_DATABASE_PATH: DATABASES_DIRECTORY + "/users.sql",
    QUERY_DATABASE_PATH: DATABASES_DIRECTORY + "/query.sql",
    PDFPRINT_DATABASE_PATH: DATABASES_DIRECTORY + "/pdfprints.sql",
    VIEWS_DATABASE_PATH: DATABASES_DIRECTORY + "/article_views.sql",
    PUBLIC_ARTICLE_CONTENTS_PATH: APPDATA_DIR + "/articles/public",
    PUBLIC_ARTICLE_IMAGES_PATH: APPDATA_DIR + "/articles/public/images",
    DRAFT_ARTICLE_CONTENTS_PATH: APPDATA_DIR + "/articles/draft",
    DRAFT_ARTICLE_IMAGES_PATH: APPDATA_DIR + "/articles/draft/images",
    TRASH_ARTICLE_CONTENTS_PATH: APPDATA_DIR + "/articles/trash",
    TRASH_ARTICLE_IMAGES_PATH: APPDATA_DIR + "/articles/trash/images",
    PDFPRINT_CONTENTS_PATH: APPDATA_DIR + "/pdfprints/public",
    PDFPRINT_THUMBNAILS_PATH: APPDATA_DIR + "/pdfprints/public",
    USER_PRIVILEGES: {
        SUPERUSER: 100,
        COORDONATOR: 50,
        USER: 10,
    },
    MAIN_PAGE_HTML_FILE_PATH: APPDATA_DIR + "/main.html",
    MAIN_PAGE_BACKGROUND_IMAGE_PATH: APPDATA_DIR + "/main.png",
    MAIN_PAGE_ARTICLE_COUNT: 12,
    COOKIE_OPTIONS: {
        httpOnly: true,
        // TODO: set to true if HTTPS only
        secure: false,
        sameSite: "strict"
    },
    SESSION_TOKEN_LENGTH: 64,
    HASH_COST: 15,
};

const mkdir_if_not_exists = (dir) => {
    if(!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {recursive: true});
    }
}

mkdir_if_not_exists(APPDATA_DIR);
mkdir_if_not_exists(DATABASES_DIRECTORY);
mkdir_if_not_exists(CONFIG.PUBLIC_ARTICLE_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.DRAFT_ARTICLE_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.TRASH_ARTICLE_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.PUBLIC_ARTICLE_IMAGES_PATH);
mkdir_if_not_exists(CONFIG.DRAFT_ARTICLE_IMAGES_PATH);
mkdir_if_not_exists(CONFIG.TRASH_ARTICLE_IMAGES_PATH);
mkdir_if_not_exists(CONFIG.PDFPRINT_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.PDFPRINT_THUMBNAILS_PATH);

module.exports = CONFIG;

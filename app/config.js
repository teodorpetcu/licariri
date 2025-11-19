const fs = require("fs");
const { fileExists } = require("./utils/util.js");

const APPDATA_DIR = "/data";
const DATABASES_DIRECTORY = APPDATA_DIR + "/databases";
const ARTICLES_DIRECTORY = APPDATA_DIR + "/articles";

const CONFIG = {
    WEBSITE_URL:  "https://licariri.ro", // PLACEHOLDER; used for sitemap
    LISTENING_PORT: 8000,
    ARTICLES_DIRECTORY: ARTICLES_DIRECTORY,
    ARTICLE_DATABASE_PATH: DATABASES_DIRECTORY + "/articles.sql",
    USERS_DATABASE_PATH: DATABASES_DIRECTORY + "/users.sql",
    QUERY_DATABASE_PATH: DATABASES_DIRECTORY + "/query.sql",
    VIEWS_DATABASE_PATH: DATABASES_DIRECTORY + "/article_views.sql",
    PUBLIC_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/public",
    PUBLIC_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/public/images",
    DRAFT_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/draft",
    DRAFT_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/draft/images",
    TRASH_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/trash",
    TRASH_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/trash/images",
    MAGAZINES_PATH: APPDATA_DIR + "/magazines/public",
    MAGAZINE_THUMBNAILS_PATH: APPDATA_DIR + "/magazines/public",
    QUERY_PRERENDERS: APPDATA_DIR + "/query",
    USER_PRIVILEGES: {
        SUPERUSER: 100,
        COORDINATOR: 50,
        USER: 10,
    },
    SITEMAP_FILE_PATH: APPDATA_DIR + "/sitemap.xml",
    MAIN_PAGE_HTML_FILE_PATH: APPDATA_DIR + "/main.html",
    MAIN_PAGE_ARTICLE_COUNT: 12,
    COOKIE_OPTIONS: {
        httpOnly: true,
        secure: true,
        sameSite: "strict"
    },
    SESSION_TOKEN_LENGTH: 64,
    HASH_COST: 15,
    WEBP_COMPRESSION_QUALITY: 70, // percent
};

const mkdir_if_not_exists = async (dir) => {
    if(! await fileExists(dir)) {
        // todo: log using winston while avoiding module circular dependency
        await fs.promises.mkdir(dir, {recursive: true});
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
mkdir_if_not_exists(CONFIG.MAGAZINES_PATH);
mkdir_if_not_exists(CONFIG.MAGAZINE_THUMBNAILS_PATH);
mkdir_if_not_exists(CONFIG.QUERY_PRERENDERS);

module.exports = CONFIG;

const fs = require("fs");

const DATABASES_DIRECTORY = __dirname + "/data",

CONFIG = {
    LISTENING_PORT: 8000,
    LOG_FILE_PATH: __dirname + "/data/runtime.log",
    ARTICLE_DATABASE_PATH: DATABASES_DIRECTORY + "/articles.sql",
    USERS_DATABASE_PATH: DATABASES_DIRECTORY + "/users.sql",
    QUERY_DATABASE_PATH: DATABASES_DIRECTORY + "/query.sql",
    PDFPRINT_DATABASE_PATH: DATABASES_DIRECTORY+ "/pdfprints.sql",
    ARTICLE_CONTENTS_PATH: __dirname + "/public/articles",
    ARTICLE_IMAGES_PATH: __dirname + "/public/images",
    PDFPRINT_CONTENTS_PATH: __dirname + "/public/pdfprints",
    PDFPRINT_THUMBNAILS_PATH: __dirname + "/public/pdfprints-thumbnails",
    USER_PRIVILEGES: {
        SUPERUSER: 100,
        COORDONATOR: 50,
        USER: 10,
    },
    MAIN_PAGE_ARTICLE_COUNT: 9,
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

mkdir_if_not_exists(DATABASES_DIRECTORY);
mkdir_if_not_exists(CONFIG.ARTICLE_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.ARTICLE_IMAGES_PATH);
mkdir_if_not_exists(CONFIG.PDFPRINT_CONTENTS_PATH);
mkdir_if_not_exists(CONFIG.PDFPRINT_THUMBNAILS_PATH);

module.exports = CONFIG;

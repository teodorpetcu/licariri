module.exports = {
    LISTENING_PORT: 8000,
    LOG_FILE_PATH: __dirname + "/data/runtime.log",
    ARTICLE_DATABASE_PATH: __dirname + "/data/articles.sql",
    USERS_DATABASE_PATH: __dirname + "/data/users.sql",
    QUERY_DATABASE_PATH: __dirname + "/data/query.sql",
    PDFPRINT_DATABASE_PATH: __dirname + "/data/pdfprints.sql",
    ARTICLE_CONTENTS_PATH: __dirname + "/public/articles",
    ARTICLE_IMAGES_PATH: __dirname + "/public/images",
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

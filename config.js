module.exports = {
    LISTENING_PORT: 8000,
    ARTICLE_DATABASE_PATH: __dirname + "/data/articles.sql",
    USERS_DATABASE_PATH: __dirname + "/data/users.sql",
    QUERY_DATABASE_PATH: __dirname + "/data/query.sql",
    ARTICLE_CONTENTS_PATH: __dirname + "/public/articles",
    ARTICLE_IMAGES_PATH: __dirname + "/public/images",
    MAIN_PAGE_ARTICLE_COUNT: 9,
    COOKIE_OPTIONS: {
        httpOnly: true,
        // TODO: set to true if HTTPS only
        secure: false,
        sameSite: "strict"
    },
};

// Copyright (C) 2026  Teodor Petcu  <petcuteodor03@gmail.com>
// This file is part of licariri.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

const path = require("path");
const APPDATA_DIR = path.resolve("../data");
const ARTICLES_DIRECTORY = APPDATA_DIR + "/articles";

const CONFIG = {
    WEBSITE_URL:  "https://licariri.ro", // PLACEHOLDER; used for sitemap
    LISTENING_PORT: 8000,
    ARTICLES_DIRECTORY: ARTICLES_DIRECTORY,
    DATABASE_PATH: APPDATA_DIR + "/licariri.sql",
    PUBLIC_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/public",
    PUBLIC_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/public/images",
    DRAFT_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/draft",
    DRAFT_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/draft/images",
    TRASH_ARTICLE_CONTENTS_PATH: ARTICLES_DIRECTORY + "/trash",
    TRASH_ARTICLE_IMAGES_PATH: ARTICLES_DIRECTORY + "/trash/images",
    MAGAZINES_PATH: APPDATA_DIR + "/magazines/public",
    MAGAZINE_THUMBNAILS_PATH: APPDATA_DIR + "/magazines/public",
    QUERY_PRERENDERS: APPDATA_DIR + "/query",
    USER_ROLES: {
        ADMINISTRATOR: "administrator",
        EDITOR: "editor",
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

module.exports = CONFIG;

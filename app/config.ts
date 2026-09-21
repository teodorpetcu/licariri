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

import path from "node:path";

const APPDATA_DIR = path.resolve("../data");
export const ARTICLES_DIRECTORY = APPDATA_DIR + "/articles";
export const WEBSITE_URL = "https://licariri.ro"; // PLACEHOLDER; used for sitemap
export const LISTENING_PORT = 8000;
export const DATABASE_PATH = APPDATA_DIR + "/licariri.sql";
export const PUBLIC_ARTICLE_CONTENTS_PATH = ARTICLES_DIRECTORY + "/public";
export const PUBLIC_ARTICLE_IMAGES_PATH = ARTICLES_DIRECTORY + "/public/images";
export const DRAFT_ARTICLE_CONTENTS_PATH = ARTICLES_DIRECTORY + "/draft";
export const DRAFT_ARTICLE_IMAGES_PATH = ARTICLES_DIRECTORY + "/draft/images";
export const TRASH_ARTICLE_CONTENTS_PATH = ARTICLES_DIRECTORY + "/trash";
export const TRASH_ARTICLE_IMAGES_PATH = ARTICLES_DIRECTORY + "/trash/images";
export const MAGAZINES_PATH = APPDATA_DIR + "/magazines/public";
export const MAGAZINE_THUMBNAILS_PATH = APPDATA_DIR + "/magazines/public";
export const QUERY_PRERENDERS = APPDATA_DIR + "/query";
export const SITEMAP_FILE_PATH = APPDATA_DIR + "/sitemap.xml";
export const MAIN_PAGE_HTML_FILE_PATH = APPDATA_DIR + "/main.html";
export const MAIN_PAGE_ARTICLE_COUNT = 12;
export const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
};
export const SESSION_TOKEN_LENGTH = 64;
export const HASH_COST = 15;
export const WEBP_COMPRESSION_QUALITY = 70; // percent

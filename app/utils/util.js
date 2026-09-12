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

const fs = require("fs");
const { logger } = require("../services/logger.js");
const CONFIG = require("../config.js");

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
const fileExists = async (path) => {
    return fs.promises.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

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

/**
 * @param {String} dir - directory to create
 */
const mkdirIfDoesntExist = async (dir) => {
    if(! await fileExists(dir)) {
        logger.info(`mkdir ${dir}`);
        await fs.promises.mkdir(dir, {recursive: true});
    }
}

/**
 * Side effect: creates all directories explicitly defined in config.js
 */
const createDataDirectoriesIfTheyDontExist = async () => {
    await Promise.all([
        mkdirIfDoesntExist(CONFIG.PUBLIC_ARTICLE_CONTENTS_PATH),
        mkdirIfDoesntExist(CONFIG.DRAFT_ARTICLE_CONTENTS_PATH),
        mkdirIfDoesntExist(CONFIG.TRASH_ARTICLE_CONTENTS_PATH),
        mkdirIfDoesntExist(CONFIG.PUBLIC_ARTICLE_IMAGES_PATH),
        mkdirIfDoesntExist(CONFIG.DRAFT_ARTICLE_IMAGES_PATH),
        mkdirIfDoesntExist(CONFIG.TRASH_ARTICLE_IMAGES_PATH),
        mkdirIfDoesntExist(CONFIG.MAGAZINES_PATH),
        mkdirIfDoesntExist(CONFIG.MAGAZINE_THUMBNAILS_PATH),
        mkdirIfDoesntExist(CONFIG.QUERY_PRERENDERS),
    ])
}

module.exports = {
    fileExists,
    formatDate,
    mkdirIfDoesntExist,
    createDataDirectoriesIfTheyDontExist,
}

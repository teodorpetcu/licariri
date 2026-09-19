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

import fs from "node:fs";
import { logger } from "../services/logger.ts";
import * as CONFIG from "../config.ts";

// FILESYSTEM OPERATIONS

export const writeFile = async (path: string, contents: string): Promise<void> => {
    return await fs.promises.writeFile(path, contents, {encoding: "utf-8"});
}

export const fileExists = async (path: string): Promise<boolean> => {
    return await fs.promises.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false);
}

export const readFileIfExists = async (path: string): Promise<string> => {
    return await fileExists(path)
        .then((st) => {
            if (st) {
                return fs.promises.readFile(path, {encoding: "utf-8"});
            } else {
                return Promise.resolve("");
            }
        });
}

export const renameFileIfExists = async (src: string, dest: string): Promise<void> => {
    return await fileExists(src)
        .then((st) => {
            if (st) {
                return fs.promises.rename(src, dest);
            } else {
                return Promise.resolve();
            }
        });
}

export const unlinkFileIfExists = async (path: string): Promise<void> => {
    return await fileExists(path)
        .then((st) => {
            if (st) {
                return fs.promises.unlink(path);
            } else {
                return Promise.resolve();
            }
        });
}

export const mkdirIfDoesntExist = async (dir: string): Promise<void> => {
    if(! await fileExists(dir)) {
        logger.info(`mkdir ${dir}`);
        await fs.promises.mkdir(dir, {recursive: true});
    }
}

/**
 * Side effect: creates all directories explicitly defined in config.js
 */
export const createDataDirectoriesIfTheyDontExist = async (): Promise<void> => {
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

// OTHER UTILITIES

export const prefixLessThanTen = (num: number): string => {
    return num < 10 ? `0${num}` : `${num}`;
}

/**
 * Return date in YYYY-MM-DD format
 */
export const formatDate = (date: Date | number): string => {
    date = new Date(date);
    const yyyy: number = date.getFullYear();
    const mm = prefixLessThanTen(date.getMonth() + 1);
    const dd = prefixLessThanTen(date.getDate());
    return `${yyyy}-${mm}-${dd}`;
}

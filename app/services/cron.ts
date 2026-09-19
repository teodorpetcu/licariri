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

import { getArticleMarkdownFilePath, type Article } from "../models/types.ts";
import articleDatabase from "../models/articles.ts";
import usersDatabase from "../models/admin.ts";
import { generateArticleTextFiles } from "../controllers/articles.ts";
import { logger } from "./logger.ts";
import { readFileIfExists } from "../utils/util.ts";

const MILISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Take all articles in the database and re-render their HTML file
 */
const updateAllArticles = async (): Promise<void> => {
    await articleDatabase.open();
    const articles = await articleDatabase.searchArticles();
    return await Promise.all(articles.map(async (article: Article) => {
        return await readFileIfExists(getArticleMarkdownFilePath(article))
            .then((content) => generateArticleTextFiles(article, content))
            .then((_status) => logger.info(`re-rendered article "${article.id}"`))
            .catch((err) => logger.error(err, `failed re-rendering article "${article.id}"`));
    })).then(() => Promise.resolve());
}

/**
 * Even if login cookies expire after 28 days, they'd also need to be
 * deleted from the database, to minimise the risk of an expired login token
 * being reused.
 *
 * The most convenient solution is to prune the database every 24 hours, at
 * midnight.
 */
const removeOldSessionsFromDatabase = async (): Promise<void> => {
    await usersDatabase.open();
    const sessions = await usersDatabase.getAllSessions();
    const today = new Date().valueOf();
    let numberRemoved = 0;
    // TODO: remove `await` from loop
    for (const session of sessions ?? []) {
        const timestamp = new Date(session.timestamp).valueOf();
        const daysDifference = Math.floor((today - timestamp) / MILISECONDS_IN_A_DAY);
        if (daysDifference > 28) {
            await usersDatabase.removeSession(session.token);
            numberRemoved += 1;
        }
    }
    logger.info(`removed ${numberRemoved} user session(s) from the database older than 28 days`);
}

const dailyUpdateJob = async (): Promise<void> => {
    logger.info("running daily update job...");
    return await Promise.all([
        removeOldSessionsFromDatabase(),
    ])
        .then(() => {
            logger.info("successfully ran daily update job");
        })
        .catch((err) => {
            logger.error(err, "during daily update job")
        });
}

const dailyUpdateJobTimer = () => {
    const midnightDate = new Date(); midnightDate.setHours(24, 0, 0, 0);
    const milisecondsToNextMidnight = midnightDate.getTime() - Date.now();
    const seconds = Math.floor((milisecondsToNextMidnight / 1000) % 60);
    const minutes = Math.floor((milisecondsToNextMidnight / (1000 * 60)) % 60);
    const hours = Math.floor((milisecondsToNextMidnight / (1000 * 60 * 60)) % 24);
    logger.info(`started daily job timer, next ETA: ${hours}h ${minutes}min ${seconds}s`)
    return setTimeout(() => {
        dailyUpdateJob();
        return setInterval(() => dailyUpdateJob, MILISECONDS_IN_A_DAY);
    }, milisecondsToNextMidnight);
}

dailyUpdateJobTimer()

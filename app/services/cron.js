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

const { articleDatabase } = require("../models/articles.js");
const { usersDatabase } = require("../models/admin.js");
const { renderArticlePage } = require("../controllers/articles.js");
const { logger } = require("./logger.js");
const { ARTICLES_DIRECTORY } = require("../config.js");

const MILISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Take all articles in the database and re-render their HTML file
 * @returns {Promise<undefined>}
 */
const updateAllArticles = async () => {
    await articleDatabase.open();
    const articles = await articleDatabase.searchArticles();
    return Promise.all(articles.map(async (article) => {
        return Promise.all([
            fs.promises.readFile(`${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`, {encoding: "utf-8"}),
            articleDatabase.getArticleStyle(article.id),
            articleDatabase.getArticleCredits(article.id),
        ])
            .then(([content, articleStyle, credits]) => renderArticlePage(article, content, articleStyle, credits))
            .then((_status) => logger.info(`re-rendered article "${article.id}"`))
            .catch((err) => logger.error(`failed re-rendering article "${article.id}"`, err));
    }));
}

/**
 * Even if login cookies expire after 28 days, they'd also need to be
 * deleted from the database, to minimise the risk of an expired login token
 * being reused.
 *
 * The most convenient solution is to prune the database every 24 hours, at
 * midnight.
 */
const removeOldSessionsFromDatabase = async () => {
    await usersDatabase.open();
    let sessions = await usersDatabase.getAllSessions();
    let today = new Date();
    let numberRemoved = 0;
    // TODO: remove `await` from loop
    for (let session of sessions) {
        let timestamp = new Date(session.timestamp);
        let daysDifference = Math.floor((today - timestamp) / MILISECONDS_IN_A_DAY);
        if (daysDifference > 28) {
            await usersDatabase.removeSession(session.token);
            numberRemoved += 1;
        }
    }
    logger.info(`removed ${numberRemoved} user session(s) from the database older than 28 days`);
}

const dailyUpdateJob = async () => {
    logger.info("running daily update job...");
    return Promise.all([
        removeOldSessionsFromDatabase(),
    ])
        .then(() => logger.info("successfully ran daily update job"))
        .catch((err) => logger.error(`during daily update job`, err))
}

const dailyUpdateJobTimer = async () => {
    let midnightDate = new Date(); midnightDate.setHours(24, 0, 0, 0);
    let milisecondsToNextMidnight = midnightDate.getTime() - Date.now();
    let seconds = Math.floor((milisecondsToNextMidnight / 1000) % 60);
    let minutes = Math.floor((milisecondsToNextMidnight / (1000 * 60)) % 60);
    let hours = Math.floor((milisecondsToNextMidnight / (1000 * 60 * 60)) % 24);
    logger.info(`started daily job timer, next ETA: ${hours}h ${minutes}min ${seconds}s`)
    return setTimeout(() => {
        dailyUpdateJob();
        return setInterval(() => dailyUpdateJob, MILISECONDS_IN_A_DAY);
    }, milisecondsToNextMidnight);
}

dailyUpdateJobTimer()

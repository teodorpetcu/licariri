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

import { Database } from "./database.ts";
import { DATABASE_PATH } from "../config.ts";

export class QueryDatabase extends Database {
    /**
     * Interpret the database at the given path as a query database
     */
    constructor(path: string) {
        super(path);
        this.name = "query";
    }

    /**
     * Create the database tables if they don't exist already.
     */
    public init = async (): Promise<void> => {
        return await this.exec(
            `CREATE TABLE IF NOT EXISTS query
            (
                articleID   TEXT NOT NULL,
                word        TEXT NOT NULL,
                UNIQUE(articleID, word),
                FOREIGN KEY (articleID) REFERENCES articles (id)
            );`
        )
    }

    /**
     * Associate every unique word in the `contents` field with the provided ID
     */
    public indexArticle = async (id: string, contents: string): Promise<void> => {
        if (!this.db) return undefined;

        const lowercase = contents.toLowerCase();
        const validWords = lowercase.replace(/[^0-9A-z\-'ăîâșțéèÿùüïôœàæêëûîâç]/g, " ").split(/\s+/);
        const uniqueWords = [... new Set(validWords.filter((word) => word))];
        const stmt = this.db.prepare("INSERT OR IGNORE INTO query (articleID, word) VALUES (?, ?)");
        for (const word of uniqueWords) {
            stmt.run([id, word], this.dbLogger.error);
        }
        return await new Promise((resolve, reject) => {
            stmt.finalize((err) => {
                if (err) {
                    return reject(err);
                }
                return resolve(undefined);
            });
        })
    }

    /**
     * Remove the word mappings for the article with the given ID, including the
     * entry for the article itself, from the database
     *
     * Note that this does not remove the words, even if they remain unmapped to
     * anything.
     */
    public unindexArticle = async (id: string): Promise<void> => {
        return await this.run('DELETE FROM query WHERE articleID = ?', [id])
            .catch((err) => {
                this.dbLogger.error(err, "unindexing article");
                return Promise.reject(err);
            });
    }

    /**
     * Return a list of the article IDs that contain *all* the given
     * words/patterns (delimited by whitespace) in their text
     */
    public findArticles = async (str: string, exact = false): Promise<string[]|void> => {
        const words = str.split(" ").map((word) => {
            if (exact) {
                return word;
            } else {
                return `%${word}%`
            }
        });
        let stmt = "";
        for (let i = 0; i < words.length; i++) {
            if (i != 0) {
                stmt += `INTERSECT\n`;
            }
            stmt += `SELECT articleID FROM query
                        WHERE word LIKE ?\n`;
        }

        return await this.all<{articleID: string}>(stmt, words)
            .then((rows) => rows.map((row) => row.articleID))
            .catch((err) => {
                this.dbLogger.error(err, "finding articles");
                return Promise.reject(err);
            });
    }
}

const queryDatabase = new QueryDatabase(DATABASE_PATH);
export default queryDatabase;

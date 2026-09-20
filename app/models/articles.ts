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

import { newArticle, newMagazine, type ArticleMeta, type Article, type ArticleStyle, type ArticleCredit, type Magazine } from "./types.ts";
import { Database } from "./database.ts";
import { DATABASE_PATH } from "../config.ts";

export class ArticleDatabase extends Database {
    /**
     * Interpret the database at the given path as for article storage
     */
    constructor(path: string) {
        super(path);
        this.name = "articles";
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    public init = (): Promise<void> => {
        return this.exec(
            `CREATE TABLE IF NOT EXISTS articles
            (
                id                  TEXT NOT NULL,
                stage               TEXT NOT NULL,
                timestamp           INT,
                title               TEXT,
                subtitle            TEXT,
                language            TEXT,
                category            TEXT,
                description         TEXT,
                UNIQUE (id)
            );
            CREATE TABLE IF NOT EXISTS article_styles
            (
                id                  TEXT NOT NULL,
                style               TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_tags
            (
                id                  TEXT NOT NULL,
                tag                 TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_authors
            (
                id                  TEXT NOT NULL,
                author              TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS article_credits
            (
                id                  TEXT NOT NULL,
                name                TEXT NOT NULL,
                credited_for        TEXT NOT NULL,
                FOREIGN KEY (id) REFERENCES articles (id)
            );
            CREATE TABLE IF NOT EXISTS magazines
            (
                timestamp           INT,
                description         TEXT,
                UNIQUE (description)
            );`
        )
    }

    public saveArticle = async (article: Article): Promise<void> => {
        return await Promise.all([
            this.saveArticleMeta(article),
            this.saveArticleStyle(article, article.style),
            this.saveArticleAuthors(article),
            this.saveArticleTags(article),
            this.saveArticleCredits(article),
        ])
            .then(() => Promise.resolve(undefined))
            .catch((err) => {
                this.dbLogger.error(err, "saving article");
                return Promise.reject(err);
            })
    }

    private saveArticleMeta = async (article: ArticleMeta): Promise<void> => {
        return await this.run(`INSERT INTO articles (
                id,
                stage,
                timestamp,
                title,
                subtitle,
                language,
                category,
                description
            ) VALUES (
                $id,
                $stage,
                $timestamp,
                $title,
                $subtitle,
                $language,
                $category,
                $description
            )`,
            {
                $id: article.id,
                $stage: article.stage,
                $timestamp: article.timestamp,
                $title: article.title,
                $subtitle: article.subtitle,
                $language: article.language,
                $category: article.category,
                $description: article.description,
        })
            .catch((err) => {
                this.dbLogger.error(err, "saving article meta");
                return Promise.reject(err);
            });
    }

    private saveArticleAuthors = async (article: Article): Promise<void> => {
        return await Promise.all((article.authors).map((author) => {
            this.run("INSERT INTO article_authors VALUES(?, ?)", [article.id, author]);
        }))
            .then(() => Promise.resolve())
            .catch((err) => {
                this.dbLogger.error(err, "adding article authors");
               ;
            })
    }

    private saveArticleTags = async (article: Article): Promise<void> => {
        return await Promise.all((article.tags).map((tag) => {
            this.run("INSERT INTO article_tags VALUES(?, ?)", [article.id, tag]);
        }))
            .then(() => Promise.resolve())
            .catch((err) => {
                this.dbLogger.error(err, "adding article tags");
               ;
            })
    }

    /**
     * Update most of the given article's metadata (except stage and timestamp)
     */
    public updateArticle = async (originalArticleID: string, article: Article): Promise<void> => {
        return await Promise.all([
            this.run('UPDATE articles SET id = $id, title = $title, subtitle = $subtitle, language = $language, category = $category, description = $description WHERE id = $originalID',
                {
                    $id: article.id,
                    $title: article.title,
                    $subtitle: article.subtitle,
                    $language: article.language,
                    $category: article.category,
                    $description: article.description,
                    $originalID: originalArticleID,
            }),

            this.run('DELETE FROM article_styles WHERE id = ?', [originalArticleID])
                .then(() => this.saveArticleStyle(article, article.style)),

            this.run('DELETE from article_authors WHERE id = ?', [originalArticleID])
                .then(() => this.saveArticleAuthors(article)),

            this.run('DELETE from article_tags WHERE id = ?', [originalArticleID])
                .then(() => this.saveArticleTags(article)),

            this.deleteArticleCredits(originalArticleID)
                .then(() => this.saveArticleCredits(article)),
        ])
            .then(() => Promise.resolve())
            .catch((err) => {
                this.dbLogger.error(err, "updating article metadata");
                return Promise.reject(err);
            });
    }

    /**
     * NOTE: this function supposes that you change the stage on the article
     * object, preferrably using `Article.failsafe_setStage()` as to avoid
     * invalid values
     */
    public updateArticleStage = async (article: ArticleMeta): Promise<void> => {
        return await this.run('UPDATE articles SET stage = ? WHERE id = ?', [article.stage, article.id])
            .catch((err) => {
                this.dbLogger.error(err, "updating article stage");
                return Promise.reject(err);
            });
    }

    private saveArticleStyle = async (article: ArticleMeta, style: ArticleStyle): Promise<void> => {
        return await this.run(`INSERT INTO article_styles (
                id,
                style
            )
            VALUES (
                $id,
                $style
            )`, {
                $id: article.id,
                $style: JSON.stringify(style),
            })
            .catch((err) => {
                this.dbLogger.error(err, "saving article styles");
                return Promise.reject(err);
            });
    }

    /**
     * Return the style object for the given article; note that an object with
     * undefined properties is returned if the database entry doesn't exist.
     */
    private getArticleStyle = async (articleID: string): Promise<ArticleStyle> => {
        return await this.get<{style: string}>('SELECT * FROM article_styles WHERE id = ?', [articleID])
            .then((row) => JSON.parse(row.style))
            .catch((err) => {
                this.dbLogger.error(err, "getting article style");
                return Promise.reject(err);
            })
    }

    /**
     * Remove all entries in the database associated with the given ID
     */
    public removeArticle = async (id: string): Promise<void> => {
        return await Promise.all([
            this.run('DELETE FROM articles WHERE id = ?', [id]),
            this.run('DELETE FROM article_authors WHERE id = ?', [id]),
            this.run('DELETE FROM article_tags WHERE id = ?', [id]),
            this.run('DELETE FROM article_credits WHERE id = ?', [id]),
            this.run('DELETE FROM article_styles WHERE id = ?', [id]),
        ])
            .then(() => Promise.resolve())
            .catch((err) => {
                this.dbLogger.error(err, "removing article from the database");
                return Promise.reject(err);
            });
    }

    /**
     * Return the list of article IDs that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     *
     * NOTE: this function is not private because `app/controllers/query.ts`
     * relies on it; this may be suboptimal
     */
    public searchArticleIDs = async (key?: string | undefined, value?: string, exact = true, pageNumber = 1, pageSize = -1): Promise<string[]> => {
        const validKeyValues = ["title", "stage", "tag", "author", undefined]
        if (! validKeyValues.includes(key)) {
            return Promise.resolve([]);
        }

        let table = "articles";
        let orderBy = "timestamp";
        if (key == "tag") {
            table = "article_tags";
            orderBy = "tag"
        } else if (key == "author") {
            table = "article_authors";
            orderBy = "author";
        }

        let stmt = `SELECT id FROM ${table}`;
        if (key == undefined){
            stmt = `SELECT id FROM articles`;
        } else if (exact) {
            stmt += ` WHERE ${key} = ?`;
        } else {
            stmt += ` WHERE ${key} LIKE ?`;
            value = `%${value}%`;
        }
        stmt += ` ORDER BY ${orderBy} DESC`;
        if (pageSize > 0) {
            stmt += ` LIMIT ${pageSize} OFFSET ${pageNumber * pageSize}`;
        }

        return await this.all<ArticleMeta>(stmt, [value])
            .then((rows) => rows.map((row) => row.id))
            .catch((err) => {
                this.dbLogger.error(err, "searching article IDs");
                return [];
            });
    }

    /**
     * Return the list of articles that match the search parameters, or
     * `undefined` if the `key` property is not one of `["title", "author",
     * "tag", undefined]`
     *
     * If `key` is `undefined`, then all articles are returned
     */
    public searchArticles = async (key?: string, value?: string, exact = true, pageNumber = 1, pageSize = -1): Promise<Article[]> => {
        return await this.searchArticleIDs(key, value, exact, pageNumber, pageSize)
            .then((articleIDs) => {
                if (!articleIDs) return [];
                return Promise.all(articleIDs.map((id) => this.getArticle(id)));
            })
            .then((found) => {
                return found.filter((a) => a !== undefined); // without filter, there's a TypeError
            })
            .catch((err) => {
                this.dbLogger.error(err, "while searching articles");
                return [];
            })
    }

    /**
     * Return all of the metadata associated with the ID of the given article
     */
    public getArticle = async (id: string): Promise<Article|undefined> => {
        return await this.getArticleMeta(id)
            .then((article) => {
                if (!article) return undefined;
                return Promise.all([
                    article,
                    this.getArticleAuthors(id),
                    this.getArticleTags(id),
                    this.getArticleCredits(id),
                    this.getArticleStyle(id),
                ]).then(([article, authors, tags, credits, style]) => {
                    if (! article || ! authors || ! tags || ! credits || ! style) {
                        return undefined;
                    }
                    return newArticle({
                        ...article,
                        authors: authors,
                        tags: tags,
                        credits: credits,
                        style: style,
                    });
                })
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting article")
                return undefined;
            });
    }

    /**
     * Get the metadata of the specified article ID
     */
    public getArticleMeta = async (id: string): Promise<ArticleMeta|undefined> => {
        return await this.get<ArticleMeta>('SELECT * FROM articles WHERE id = ?', [id])
            .then((row) => newArticle({
                id: row.id,
                stage: row.stage,
                timestamp: row.timestamp,
                title: row.title,
                subtitle: row.subtitle,
                language: row.language,
                category: row.category,
                description: row.description,
            }))
            .catch((err) => {
                this.dbLogger.error(err, "getting article meta");
                return undefined;
            });
    }

    /**
     * Return the array of 'Author's that are associated with the given article ID
     */
    // TODO: return undefined if article is nonexistent
    private getArticleAuthors = async (id: string): Promise<string[]> => {
        return await this.all<{author: string}>('SELECT author FROM article_authors WHERE id = ? ORDER BY author ASC', [id])
            .then((rows) => rows.map((row) => row.author))
            .catch((err) => {
                this.dbLogger.error(err, "getting article authors");
                return [];
            });
    }

    /**
     * Return the array of all the tags that the article ID is associated with
     */
    // TODO: return undefined if article is nonexistent
    private getArticleTags = async (id: string): Promise<string[]> => {
        return await this.all<{tag: string}>('SELECT tag FROM article_tags WHERE id = ? ORDER BY tag ASC', [id])
            .then((rows) => rows.map((row) => row.tag))
            .catch((err) => {
                this.dbLogger.error(err, "getting article tags");
                return [];
            });
    }

    /**
     * Default title scheme: `Articol fără titlu (N)`, where `N` is a number
     * Equivalent ID: `articol-fără-titlu-(N)`
     */
    public getNextNewArticleTitle = async (): Promise<string> => {
        return await this.get<{next_n: number}>(`SELECT COALESCE(MAX(CAST(REPLACE(REPLACE(id, 'articol-fără-titlu-(', ''), ')', '') AS INTEGER)), 0) + 1 AS next_n FROM articles WHERE id LIKE 'articol-fără-titlu-(%'`)
            .then((row) => "Articol fără titlu (" + row.next_n + ")")
            .catch((err) => {
                this.dbLogger.error(err, "getting next new article title");
                return Promise.reject();
            });
    }

    /**
     * Add the given magazine to the database
     */
    public addMagazine = async (magazine: Magazine): Promise<void> => {
        return await this.run(`INSERT OR IGNORE into magazines VALUES (?, ?)`, [magazine.timestamp, magazine.description])
            .catch((err) => {
                this.dbLogger.error(err, "adding magazine");
                return Promise.reject(err);
            });
    }

    /**
     * Remove the given magazine from the database
     */
    public removeMagazine = async (magazineDescription: string): Promise<void> => {
        return await this.run(`DELETE FROM magazines WHERE description = ?`, [magazineDescription])
            .catch((err) => {
                this.dbLogger.error(err, "removing magazine");
                return Promise.reject(err);
            });
    }

    public getAllMagazinesSorted = async (): Promise<Magazine[]> => {
        return await this.all<Magazine>(`SELECT * FROM magazines ORDER BY timestamp DESC`)
            .then((rows) => rows.map((row) => newMagazine(row.timestamp, row.description)))
            .catch((err) => {
                this.dbLogger.error(err, "getting all magazines");
                return Promise.reject(err);
            });
    }

    private saveArticleCredits = async (article: Article): Promise<void> => {
        for (const credit of article.credits) {
            if (credit.name) {
                return await this.run('INSERT OR REPLACE INTO article_credits VALUES (?, ?, ?)', [article.id, credit.name, credit.credited_for])
                    .catch((err) => this.dbLogger.error(err, "adding article credits"));
            } else {
                return await Promise.reject("empty name");
            }
        }
    }

    private deleteArticleCredits = async (articleID: string): Promise<void> => {
        return await this.run('DELETE FROM article_credits WHERE id = ?', [articleID])
            .catch((err) => this.dbLogger.error(err, "removing article credits"));
    }

    private getArticleCredits = async (articleID: string): Promise<ArticleCredit[]> => {
        return await this.all<ArticleCredit>('SELECT * FROM article_credits WHERE id = ? ORDER BY name', [articleID])
            .then((rows) => {
                return rows.map((row) => {return {name: row.name, credited_for: row.credited_for}});
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting article credits");
                return Promise.reject(err);
            })
    }
}

const articleDatabase = new ArticleDatabase(DATABASE_PATH);
export default articleDatabase;

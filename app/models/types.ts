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

import { formatDate } from "../utils/util.ts";
import { randomBytes } from "node:crypto";
import { ARTICLES_DIRECTORY, SESSION_TOKEN_LENGTH } from "../config.ts";

export const generateArticleID = (title: string): string => {
    return title.toLowerCase().replaceAll(/[,.?*!:;"'<>]/g, "").replaceAll(/\s/g, "-");
}

export interface ArticleMeta {
    id: string,
    title: string,
    timestamp: number,
    date: string,
    lastmod?: number,
    stage: ArticleStage,
    subtitle: string,
    language: ArticleLanguage,
    category: string,
    description: string,
}

export interface Article extends ArticleMeta {
    authors: string[],
    tags: string[],
    credits: ArticleCredit[],
    style: ArticleStyle,
}

export type ArticleStage = "public" | "draft" | "trash";

export type ArticleLanguage = "ro" | "en" | "fr" | "de";

export type ArticleCategory = string;

export interface ArticleCredit {
    name: string,
    credited_for: "editorial" | "dtp" | "thumbnail",
}

const newArticleMeta = (data: Partial<ArticleMeta> & Pick<ArticleMeta, "title">): ArticleMeta => {
    const timestamp = data.timestamp ?? Date.now();
    return {
        id: generateArticleID(data.title),
        title: data.title,
        timestamp: timestamp,
        date: formatDate(timestamp),
        stage: data.stage ?? "draft",
        subtitle: data.subtitle ?? "",
        language: data.language ?? "ro",
        category: data.category ?? "general",
        description: data.description ?? "",
    }
}

export const newArticle = (data: Partial<Article> & Pick<Article, "title">): Article => {
    return {
        ...newArticleMeta(data),
        authors: data.authors ?? [],
        tags: data.tags ?? [],
        credits: data.credits ?? [],
        style: data.style ?? newArticleStyle({}),
    }
}

export const getArticleHTMLFilePath = (article: ArticleMeta) => {
    return `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.html`;
}

export const getArticleMarkdownFilePath = (article: ArticleMeta) => {
    return `${ARTICLES_DIRECTORY}/${article.stage}/${article.id}.md`;
}

export const getArticleThumbnailPath = (article: ArticleMeta) => {
    return `${ARTICLES_DIRECTORY}/${article.stage}/images/${article.id}.webp`;
}

export interface ArticleStyle {
    hideTitleInThumbnail: boolean,
    title: {
        font: string,
        color: string,
        fillStyle: boolean, // for color that complements background
        position: "thumbnail" | "article",
        fontSizeArticle: number,
        fontSizeThumbnail: number,
        fontWeight: number,
    }
    subtitle: {
        font: string,
        color: string,
        position: "thumbnail" | "article",
        fontSize: number,
        fontWeight: number,
    }
    article: {
        firstLetter: "default" | "dropcap",
    }
}

export const newArticleStyle = (data: Partial<ArticleStyle>): ArticleStyle => {
    return {
        hideTitleInThumbnail: data.hideTitleInThumbnail ?? false,
        title: {
            font: data.title?.font ?? "Kameron",
            color: data.title?.color ?? "black",
            fillStyle: data.title?.fillStyle ?? false,
            position: data.title?.position ?? "thumbnail",
            fontSizeThumbnail: data.title?.fontSizeThumbnail ?? 2,
            fontSizeArticle: data.title?.fontSizeArticle ?? 3.5,
            fontWeight: data.title?.fontWeight ?? 600,
        },
        subtitle: {
            font: data.title?.font ?? "Kameron",
            color: data.title?.color ?? "black",
            position: data.title?.position ?? "thumbnail",
            fontSize: data.title?.fontSizeArticle ?? 1.5,
            fontWeight: data.subtitle?.fontWeight ?? 600,
        },
        article: {
            firstLetter: data.article?.firstLetter ?? "default",
        },
    };
}

export interface Magazine {
    timestamp: number,
    date: string,
    description: string,
    filename: string,
}

export const newMagazine = (timestamp: number, description: string): Magazine => {
    return {
        timestamp,
        date: formatDate(new Date(timestamp)),
        description,
        filename: description + ".pdf",
    }
}

export interface User {
    id: string,
    role: UserRole,
    suspended: number,
    password?: string,
}

export type UserRole = "administrator" | "editor";

export const newUser = (id: string, role: UserRole, suspended = 0): User => {
    return {
        id,
        role,
        suspended,
    }
}

export interface Session {
    user_id: string, // TODO: rename to camelCase
    token: string,
    timestamp: number,
}

export const newSession = (user_id: string,
                token = randomBytes(SESSION_TOKEN_LENGTH).toString("hex"),
                timestamp = Date.now()): Session => {
    return {
        user_id,
        token,
        timestamp
    }
}

export type UserActivityAction =
    "changepassword" | "suspendUser" | "unSuspendUser" | "adduser" | // users
    "modify" | "rename" | "publish" | "draft" | "trash" | // articles
    "addmagazine" | "rmmagazine"; // magazines

export interface Activity {
    user: string,
    action: UserActivityAction,
    target: string,
    timestamp: number,
}

export const newActivity = (user_id: string, action: UserActivityAction, target: string, timestamp = new Date()): Activity => {
    return {
        user: user_id,
        action,
        target,
        timestamp: timestamp.valueOf(),
    }
}

export interface ArticleModificationRequestBody {
    article: FormArticle,
    markdownContents: string,
}

type ArticleNonFormFields = "id" | "timestamp" | "date" | "stage";
export type FormArticleMeta = Omit<ArticleMeta, ArticleNonFormFields>;
export type FormArticle = Omit<Article, ArticleNonFormFields>;

export interface SanitisedArticleModificationRequestBody {
    article: Article,
    markdownContents: string,
}

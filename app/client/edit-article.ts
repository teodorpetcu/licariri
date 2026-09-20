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

import { ArticleCredit, ArticleStyle, ArticleLanguage, FormArticleMeta, ArticleModificationRequestBody } from "../models/types.ts";

const contentPage = (document.getElementById("edit-article-content") as HTMLDivElement);
const dtpPage = (document.getElementById("edit-article-dtp") as HTMLDivElement);
const previewPage = (document.getElementById("article-page") as HTMLDivElement);
const articleInputForm = (document.getElementById("inputform") as HTMLFormElement);

const resetInputThumbnailButton = (document.getElementById("reset-input-thumbnail-button") as HTMLButtonElement);
const inputThumbnail = (document.getElementById("input-thumbnail") as HTMLInputElement);
const previewMinifiedThumbnailTitle = (document.getElementById("preview-minified-thumbnail-title") as HTMLElement);
const previewMinifiedThumbnailImage = (document.getElementById("preview-minified-thumbnail-img") as HTMLImageElement);

const ARTICLE_ID: string = location.href.substring(location.href.lastIndexOf("/") + 1);

const getArticleMetaFromFormData = (formData: FormData): FormArticleMeta => {
    return {
        title: formData.get("article.title") as string,
        subtitle: formData.get("article.subtitle") as string,
        category: formData.get("article.category") as string,
        // language is guaranteed to be ArticleLanguage because it's picked from
        // a set of options
        language: formData.get("article.language") as ArticleLanguage,
        description: "",
    };
}

const getArticleStyleFromFormData = (formData: FormData): ArticleStyle => {
    const hideTitleInThumbnailRaw = formData.get("article.style.hideTitleInThumbnail");
    return {
        hideTitleInThumbnail: hideTitleInThumbnailRaw == "on" ? true : false,
        // style properties are more or less guaranteed to correspond, since
        // they're premade options
        title: {
            font: formData.get("article.style.title.font") as string,
            color: formData.get("article.style.title.color") as string,
            fillStyle: formData.get("article.style.title.fillStyle") == "on",
            position: formData.get("article.style.title.position") as "thumbnail" | "article",
            fontSizeArticle: Number(formData.get("article.style.title.fontSizeArticle")),
            fontSizeThumbnail: Number(formData.get("article.style.title.fontSizeThumbnail")),
            fontWeight: Number(formData.get("article.style.title.fontWeight")),
        },
        subtitle: {
            font: formData.get("article.style.subtitle.font") as string,
            color: formData.get("article.style.subtitle.color") as string,
            position: formData.get("article.style.subtitle.position") as "thumbnail" | "article",
            fontSize: Number(formData.get("article.style.subtitle.fontSize")),
            fontWeight: Number(formData.get("article.style.subtitle.fontWeight")),
        },
        article: {
            firstLetter: formData.get("article.style.article.firstLetter") as "default" | "dropcap",
        }
    };
}

const makeArticleCredit = (name: string, credited_for: "editorial" | "dtp" | "thumbnail"): ArticleCredit => {
    return { name, credited_for };
}

const getArticleCreditsFromFormData = (formData: FormData): ArticleCredit[] => {
    const editorial: string[] = (formData.get("article.credits.editorial") as string).split(", ").filter(x => x);
    const dtp: string[] = (formData.get("article.credits.dtp") as string).split(", ").filter(x => x);
    const thumbnail: string[] = (formData.get("article.credits.thumbnail") as string).split(", ").filter(x => x);
    return editorial.map(name => makeArticleCredit(name, "editorial"))
        .concat(dtp.map(name => makeArticleCredit(name, "dtp")))
        .concat(thumbnail.map(name => makeArticleCredit(name, "thumbnail")))
}

const getArticleFromFormData = (): ArticleModificationRequestBody => {
    const formData = new FormData(articleInputForm);
    return {
        article: {
            ...getArticleMetaFromFormData(formData), // fill remaining properties
            authors: formData.getAll("article.authors") as string[],
            tags: formData.getAll("article.tags") as string[],
            style: getArticleStyleFromFormData(formData),
            credits: getArticleCreditsFromFormData(formData),
        },
        markdownContents: formData.get("contents") as string,
    };
}

const getArticleThumbnail = (): File | undefined => {
    return inputThumbnail.files?.item(0) ?? undefined;
}

const updatePreviewThumbnail = () => {
    if (! inputThumbnail.files) return;
    const [uploadedThumbnail] = inputThumbnail.files ?? [undefined];
    if (uploadedThumbnail) {
        previewMinifiedThumbnailImage.src = URL.createObjectURL(uploadedThumbnail);
    } else {
        previewMinifiedThumbnailImage.src = `/admin/articles/images/${ARTICLE_ID}.webp`;
    }
    const reqBody: ArticleModificationRequestBody = getArticleFromFormData();
    const article = reqBody.article;
    if (article.style.hideTitleInThumbnail) {
        previewMinifiedThumbnailTitle.innerText = "";
    } else {
        previewMinifiedThumbnailTitle.innerText = article.title;
    }
    previewMinifiedThumbnailTitle.style.fontFamily = article.style.title.font;
    previewMinifiedThumbnailTitle.style.fontSize = String(article.style.title.fontSizeThumbnail) + "rem";
    previewMinifiedThumbnailTitle.style.fontWeight = String(article.style.title.fontWeight);
    previewMinifiedThumbnailTitle.style.color = article.style.title.color;
    if (article.style.title.fillStyle) {
        previewMinifiedThumbnailTitle.classList.add("colour-complement-background");
    } else {
        previewMinifiedThumbnailTitle.classList.remove("colour-complement-background");
    }
}

updatePreviewThumbnail(); // to initialise it

const showContentPage = () => {
    contentPage.style.display = "grid";
    dtpPage.style.display = "none";
    previewPage.style.display = "none";
}

const showDTPPage = () => {
    contentPage.style.display = "none";
    dtpPage.style.display = "grid";
    previewPage.style.display = "none";
}

const showPreviewPage = () => {
    const articleReq = getArticleFromFormData();
    if (! articleReq.markdownContents) articleReq.markdownContents = "";
    fetch(`/admin/articles/${ARTICLE_ID}/preview`, {
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Accepts': 'text/html'
        },
        body: JSON.stringify(articleReq),
    })
        .then((response) => {
            return response.text();
        })
        .then((html) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            const previewPageArticleThumbnail = (doc.getElementById("article-thumbnail") as HTMLImageElement);
            const [newThumbnail] = inputThumbnail.files ?? [undefined];
            if (newThumbnail) {
                previewPageArticleThumbnail.src = URL.createObjectURL(newThumbnail);
            }
            previewPage.innerHTML = doc.body.innerHTML;
        });

    contentPage.style.display = "none";
    dtpPage.style.display = "none";
    previewPage.style.display = "grid";
}

document.getElementById("button-edit-content")!.addEventListener("click", showContentPage);
document.getElementById("button-edit-dtp")!.addEventListener("click", showDTPPage);
document.getElementById("button-preview")!.addEventListener("click", showPreviewPage);

const warnOnLeave = (event: Event) => {
    event.preventDefault();
    event.returnValue = true;
}
globalThis.addEventListener("beforeunload", warnOnLeave);

articleInputForm.addEventListener("change", updatePreviewThumbnail);

resetInputThumbnailButton.addEventListener("click", () => {
    inputThumbnail.value = "";
    updatePreviewThumbnail(); // because changes due to JS don't trigger a form change event
})

const generateArticleID = (title: string): string => {
    return title.toLowerCase().replaceAll(/[,.?*!:;"'<>]/g, "").replaceAll(/\s/g, "-");
}

const uploadArticleModificationRequest = async (articleReq: ArticleModificationRequestBody) => {
    const formData = new FormData();
    formData.append("article", JSON.stringify(articleReq.article));
    formData.append("markdownContents", articleReq.markdownContents);

    const thumbnail = getArticleThumbnail();
    if (thumbnail) {
        formData.append("thumbnail", thumbnail);
    }

    const action: string = ARTICLE_ID != "new" ? articleInputForm.action : generateArticleID(articleReq.article.title);
    const method: string = String(new FormData(articleInputForm).get("_method") ?? "post");

    return await fetch(action, {
        method,
        headers: {
            'Accepts': 'text/html'
        },
        body: formData,
        redirect: "follow"
    }).then((response) => {
        if (response.redirected) {
            globalThis.removeEventListener("beforeunload", warnOnLeave);
            globalThis.location.href = response.url;
        }
    });
}

articleInputForm.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const articleReq = getArticleFromFormData();

    uploadArticleModificationRequest(articleReq);
})

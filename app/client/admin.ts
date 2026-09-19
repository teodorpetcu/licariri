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

import type { Activity, Article, ArticleMeta, Magazine, User } from "../models/types.ts";

type adminDashboardPanelNames = "change-password" | "users" | "activity" | "articles" | "magazines";

const mainContent: HTMLElement = document.getElementById("content")!;

const render = (...elements: HTMLElement[]): void => {
    mainContent.replaceChildren(...elements);
}

const addTextCellToRow = (text: string, row: HTMLTableRowElement): void => {
    const td = document.createElement("td");
    td.textContent = text;
    row.appendChild(td);
}

const addHTMLElementToRow = (element: HTMLElement, row: HTMLTableRowElement): void => {
    const td = document.createElement("td");
    td.appendChild(element);
    row.appendChild(td);
}

const createRow = (valuesList: (HTMLElement | string)[]): HTMLTableRowElement => {
    const row = document.createElement("tr");
    valuesList.forEach(value => {
        if (value instanceof HTMLElement) {
            addHTMLElementToRow(value, row)
        } else {
            addTextCellToRow(value, row)
        }
    });
    return row;
}

const confirmPopup = (): boolean => {
    return confirm("Ești sigur?!");
}

const createActionButton = (target: string, text: string, askForConfirmation=false): HTMLAnchorElement => {
    const button = document.createElement("a");
    button.textContent = text;
    button.href = target;
    if (askForConfirmation) {
        button.onclick = confirmPopup;
    }
    return button;
}

const createLabelForInput = (text: string, htmlFor: string): HTMLLabelElement => {
    const label = document.createElement("label");
    label.textContent = text;
    label.htmlFor = htmlFor;
    return label;
}

const createInputField = (type: string, name?: string): HTMLInputElement => {
    const inputField = document.createElement("input");
    inputField.type = type;
    if (name != undefined) inputField.name = name;
    return inputField
}

const createSubmitButtonWithIcon = (title: string, fa_icon: string): HTMLButtonElement => {
    const button = document.createElement("button");
    button.type = "submit";
    button.title = title;
    const buttonIcon = document.createElement("i");
    buttonIcon.classList.add("fa", fa_icon);
    button.appendChild(buttonIcon);

    return button;
}

const createPostForm = (action: string): HTMLFormElement => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = action;

    return form;
}

const createContentPanelHeading = (sectionTitle: string, buttonAction?: string): HTMLDivElement => {
    const panel = document.createElement("div");
    panel.classList.add("panel-heading")
    const titleHeader = document.createElement("h1");
    titleHeader.textContent = sectionTitle;
    panel.appendChild(titleHeader);
    if (buttonAction) {
        const button = createActionButton(buttonAction, "+", false);
        panel.appendChild(button);
    }
    return panel;
}

const appendChildren = (parentElem: HTMLElement, childrenElems: HTMLElement[]): void => {
    childrenElems.forEach(child => parentElem.appendChild(child));
}

const renderChangePassword = (): void => {
    const panel = createContentPanelHeading("Schimbare parolă");
    const form = createPostForm("/admin/change-password");

    const originalPasswordLabel = createLabelForInput("Parola actuală:", "original");
    const originalPasswordInput = createInputField("password", "original");
    const passwordLabel = createLabelForInput("Parola nouă:", "password");
    const passwordInput = createInputField("password", "password");
    const confirmPasswordLabel = createLabelForInput("Confirmă parola:", "password");
    const confirmPasswordInput = createInputField("password", "confirm-password");
    const submitButton = createInputField("submit");
    submitButton.value = "Schimbă";

    const validateSamePassword = (): void => {
        if (passwordInput.value != confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity("Parolele sunt diferite");
        } else {
            confirmPasswordInput.setCustomValidity("");
        }
    }
    const validateValues = (): boolean => {
        [originalPasswordInput, passwordInput, confirmPasswordInput].forEach((input) => {
            if (! input.value) {
                input.setCustomValidity("Câmp obligatoriu");
                return false;
            } else {
                input.setCustomValidity("");
            }
        })
        return true;
    }

    passwordInput.onchange = validateSamePassword;
    confirmPasswordInput.onkeyup = validateSamePassword;
    submitButton.onclick = validateValues;

    appendChildren(form, [originalPasswordLabel, originalPasswordInput, passwordLabel, passwordInput, confirmPasswordLabel, confirmPasswordInput, submitButton]);

    render(panel, form);
}

const createAddUserDiv = (): HTMLDivElement => {
    const addUserDiv = document.createElement("div");
    const formTitle = document.createElement("h3");
    formTitle.textContent = "Adaugă utilizator";
    const addUserForm = createPostForm("/admin/change-password");
    const usernameLabel = createLabelForInput("Nume:", "id");
    const usernameInput = createInputField("text", "id");
    const passwordLabel = createLabelForInput("Parola:", "password");
    const passwordInput = createInputField("password", "password");
    const roleLabel = createLabelForInput("Statut:", "role");
    const roleInput = document.createElement("select");
    roleInput.name = "role";
    for (const role of ["editor", "administrator"]) {
        const option = document.createElement("option");
        option.innerHTML = role;
        roleInput.appendChild(option);
    }
    usernameInput.onchange = () => {if (! usernameInput.value) usernameInput.setCustomValidity("Numele de utilizator trebuie completat")};
    passwordInput.onchange = () => {if (! passwordInput.value) passwordInput.setCustomValidity("Parola trebuie completată")};
    const submitButton = createInputField("submit");
    submitButton.value = "Adaugă"
    const validateValues = (): boolean => {
        [usernameInput, passwordInput].forEach((input) => {
            if (! input.value) {
                input.setCustomValidity("Câmp obligatoriu");
                return false;
            } else {
                input.setCustomValidity("");
            }
        })
        return true;
    }
    submitButton.onclick = validateValues;
    appendChildren(addUserForm, [usernameLabel, usernameInput, passwordLabel, passwordInput, roleLabel, roleInput, submitButton]);
    appendChildren(addUserDiv, [formTitle, addUserForm]);
    return addUserDiv;
}

const renderUsers = (usersJSON: User[]): void => {
    const panel = createContentPanelHeading("Utilizatori");
    const addUserDiv = createAddUserDiv();
    panel.appendChild(addUserDiv);

    const table = document.createElement("table");
    const headerRow = createRow(["Nume", "Rol", "Acțiuni"]);
    table.appendChild(headerRow);
    for (const user of usersJSON) {
        const row = createRow([user.id, user.role]);
        table.appendChild(row);
    }

    render(panel, table)
}

const renderActivity = (activityJSON: Activity[]): void => {
    const panel = createContentPanelHeading("Activitate");
    const table = document.createElement("table");
    const headerRow = createRow(["Data", "Utilizator", "Acțiune", "Obiect"]);
    table.appendChild(headerRow);
    for (const activity of activityJSON) {
        const row = createRow([String(activity.timestamp), activity.user, activity.action, activity.target]);
        table.appendChild(row);
    }
    render(panel, table)
}

const articleStageButtons = (article: ArticleMeta): HTMLDivElement => {
    const elem = document.createElement("div");
    elem.classList.add("article-stages");
    [["public", "fa-trophy"], ["draft", "fa-pencil"], ["trash", "fa-trash"]].forEach(([stage, icon]) => {
        const stageForm = createPostForm("/admin/articles/" + article.id + "/stage");
        const newStageHiddenInput = createInputField("hidden", "stage");
        newStageHiddenInput.value = stage;

        const submitButton = createSubmitButtonWithIcon(stage, icon);
        submitButton.classList.add("stage-button", "stage-button-"+stage);

        if (stage == article.stage) {
            submitButton.classList.add("stage-button-current");
            submitButton.onclick = () => {return false};
        } else {
            submitButton.onclick = confirmPopup;
        }
        appendChildren(stageForm, [newStageHiddenInput, submitButton]);
        elem.appendChild(stageForm);
    })
    return elem;
}

const renderArticles = (articleJSON: Article[]): void => {
    const panel = createContentPanelHeading("Articole", "/admin/articles/new");

    const table = document.createElement("table");
    const headerRow = createRow(["Titlu", "Autor(i)", "Stadiu", "Data publicării", "Acțiuni"]);
    table.appendChild(headerRow);

    for (const article of articleJSON) {
        let title: HTMLAnchorElement | string;
        if (article.stage == "public") {
            const titleLink = document.createElement("a");
            titleLink.textContent = article.title;
            titleLink.href = "/articles/" + article.id;
            title = titleLink;
        } else {
            title = article.title;
        }
        const modifyButton = createActionButton("/admin/articles/" + article.id, "modifică", false);
        const articleStage = articleStageButtons(article);

        const row = createRow([title, article.authors.join(", "), articleStage, article.date, modifyButton]);
        table.appendChild(row);
    }
    render(panel, table);
}

const createAddMagazineDiv = (): HTMLDivElement => {
    const addMagazineDiv = document.createElement("div");
    const formTitle = document.createElement("h3");
    formTitle.textContent = "Adaugă revistă (PDF)";
    const addMagazineForm = createPostForm("/admin/magazines/new");
    const nameLabel = createLabelForInput("Numele ediției:", "description");
    const nameInput = createInputField("text", "description");
    const dateLabel = createLabelForInput("Data publicării:", "date");
    const dateInput = createInputField("date", "date");
    const fileLabel = createLabelForInput("Fișier:", "file");
    const fileInput = createInputField("file", "file");
    fileInput.accept = "application/pdf";

    const submitButton = createInputField("submit");
    submitButton.value = "Adaugă";
    const validateValues = () => {
        [nameInput, dateInput, fileInput].forEach((input) => {
            if (! input.value) {
                input.setCustomValidity("Câmp obligatoriu");
                return false;
            } else {
                input.setCustomValidity("");
            }
        })
        return true;
    }
    submitButton.onclick = validateValues;

    appendChildren(addMagazineForm, [nameLabel, nameInput, dateLabel, dateInput, fileLabel, fileInput, submitButton]);
    appendChildren(addMagazineDiv, [formTitle, addMagazineForm]);

    return addMagazineDiv;
}

const renderMagazines = (magazinesJSON: Magazine[]): void => {
    const panel = createContentPanelHeading("Reviste arhivate");
    const addMagazineDiv = createAddMagazineDiv();

    const table = document.createElement("table");
    const headerRow = createRow(["Revistă", "Acțiuni"]);
    table.appendChild(headerRow);
    for (const magazine of magazinesJSON) {
        const titleLink = document.createElement("a");
        titleLink.textContent = magazine.description;
        titleLink.href = "/magazines/" + magazine.filename;
        const removeButton = createActionButton("/admin/magazines/" + magazine.description, "", true);
        removeButton.classList.add("delete-button");
        removeButton.classList.add("fa");
        removeButton.classList.add("fa-trash-o");
        const row = createRow([titleLink, removeButton]);
        table.appendChild(row);
    }
    panel.appendChild(addMagazineDiv);
    render(panel, table);
}

const loadPanel = async (panel: adminDashboardPanelNames | string): Promise<void> => {
    if (panel == "change-password") {
        renderChangePassword();
    } else {
        const response = await fetch("/admin/" + panel);
        const jsonData = await response.json();
        switch(panel) {
            case "users":
                renderUsers(jsonData);
                break;
            case "activity":
                renderActivity(jsonData);
                break;
            case "articles":
                renderArticles(jsonData);
                break;
            case "magazines":
                renderMagazines(jsonData);
                break;
            default:
                render();
        }
    }
}

globalThis.addEventListener("hashchange", () => {
    loadPanel(location.hash.substring(1));
});

// to initalise
if (location.hash.substring(1)) {
    loadPanel(location.hash.substring(1))
} else {
    location.hash = "#articles"; // triggers the event listener
}

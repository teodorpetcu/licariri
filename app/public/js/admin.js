const panels = [
    "change-password",
    "users",
    "activity",
    "articles",
    "magazines",
];

const mainContent = document.getElementById("content");

const render = (...elements) => {
    mainContent.replaceChildren(...elements);
}

const addTextCellToRow = (text, row) => {
    const td = document.createElement("td");
    td.textContent = text;
    row.appendChild(td);
}

const addHTMLElementToRow = (element, row) => {
    const td = document.createElement("td");
    td.appendChild(element);
    row.appendChild(td);
}

const createRow = (valuesList) => {
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

const confirmPopup = () => {
    return confirm("Ești sigur?!");
}

const createActionButton = (target, text, askForConfirmation=false) => {
    const button = document.createElement("a");
    button.textContent = text;
    button.href = target;
    if (askForConfirmation) {
        button.onclick = confirmPopup;
    }
    return button;
}

const createLabelForInput = (text, htmlFor) => {
    const label = document.createElement("label");
    label.textContent = text;
    label.htmlFor = htmlFor;
    return label;
}

const createInputField = (type, name=undefined) => {
    const inputField = document.createElement("input");
    inputField.type = type;
    if (name != undefined) inputField.name = name;
    return inputField
}

const createSubmitButtonWithIcon = (title, fa_icon) => {
    const button = document.createElement("button");
    button.type = "submit";
    button.title = title;
    const buttonIcon = document.createElement("i");
    buttonIcon.classList.add("fa", fa_icon);
    button.appendChild(buttonIcon);

    return button;
}

const createPostForm = (action) => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = action;

    return form;
}

const createContentPanelHeading = (sectionTitle, buttonAction=undefined) => {
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

const appendChildren = (parentElem, childrenElems) => {
    childrenElems.forEach(child => parentElem.appendChild(child));
}

const renderChangePassword = async () => {
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

    const validateSamePassword = () => {
        if (passwordInput.value != confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity("Parolele sunt diferite");
        } else {
            confirmPasswordInput.setCustomValidity("");
        }
    }
    const validateValues = () => {
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

const createAddUserDiv = () => {
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
    ["editor", "administrator"].forEach((role) => {
        const option = document.createElement("option");
        option.value = role.toUpperCase();
        option.innerHTML = role;
        roleInput.appendChild(option);
    });
    usernameInput.onchange = () => {if (! usernameInput.value) usernameInput.setCustomValidity("Numele de utilizator trebuie completat")};
    passwordInput.onchange = () => {if (! passwordInput.value) passwordInput.setCustomValidity("Parola trebuie completată")};
    const submitButton = createInputField("submit");
    submitButton.value = "Adaugă"
    const validateValues = () => {
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

const renderUsers = async (usersJSON) => {
    const panel = createContentPanelHeading("Utilizatori");
    const addUserDiv = createAddUserDiv();
    panel.appendChild(addUserDiv);

    const table = document.createElement("table");
    const headerRow = createRow(["Nume", "Rol", "Acțiuni"]);
    table.appendChild(headerRow);
    for (user of usersJSON) {
        const row = createRow([user.id, user.role]);
        table.appendChild(row);
    }

    render(panel, table)
}

const renderActivity = async (activityJSON) => {
    const panel = createContentPanelHeading("Activitate");
    const table = document.createElement("table");
    const headerRow = createRow(["Data", "Utilizator", "Acțiune", "Obiect"]);
    table.appendChild(headerRow);
    for (activity of activityJSON) {
        const row = createRow([activity.timestamp, activity.user_id, activity.action, activity.target]);
        table.appendChild(row);
    }
    render(panel, table)
}

const articleStageButtons = async (article) => {
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

const renderArticles = async (articleJSON) => {
    const panel = createContentPanelHeading("Articole", "/admin/articles/new");

    const table = document.createElement("table");
    const headerRow = createRow(["Titlu", "Autori", "Stadiu", "Data publicării", "Acțiuni"]);
    table.appendChild(headerRow);

    for (article of articleJSON) {
        const titleLink = document.createElement("a");
        titleLink.textContent = article.title;
        titleLink.href = "/articles/" + article.id;
        const modifyButton = createActionButton("/admin/articles/" + article.id, "modifică", askForConfirmation=false);
        const articleStage = await articleStageButtons(article);

        const row = createRow([titleLink, article.authors.join(", "), articleStage, article.date, modifyButton]);
        table.appendChild(row);
    }
    render(panel, table);
}

const createAddMagazineDiv = () => {
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

const renderMagazines = async (magazinesJSON) => {
    const panel = createContentPanelHeading("Reviste arhivate");
    const addMagazineDiv = createAddMagazineDiv();

    const table = document.createElement("table");
    const headerRow = createRow(["Revistă", "Acțiuni"]);
    table.appendChild(headerRow);
    for (magazine of magazinesJSON) {
        const titleLink = document.createElement("a");
        titleLink.textContent = magazine.description;
        titleLink.href = "/magazines/" + magazine.filename;
        const removeButton = createActionButton("/admin/magazines/" + magazine.description, "", askForConfirmation=true);
        removeButton.classList.add("delete-button");
        removeButton.classList.add("fa");
        removeButton.classList.add("fa-trash-o");
        const row = createRow([titleLink, removeButton]);
        table.appendChild(row);
    }
    panel.appendChild(addMagazineDiv);
    render(panel, table);
}

const loadPanel = async (panel) => {
    if (panel == "change-password") {
        renderChangePassword();
    } else {
        let response = await fetch("/admin/" + panel);
        let jsonData = await response.json();
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
                render(undefined);
        }
    }
}

window.addEventListener("hashchange", () => {
    loadPanel(location.hash.substring(1));
});

// to initalise
if (location.hash.substring(1)) {
    loadPanel(location.hash.substring(1))
} else {
    location.hash = "#articles"; // triggers the event listener
}

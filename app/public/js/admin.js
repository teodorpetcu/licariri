const panels = [
    "change-password",
    "users",
    "activity",
    "articles",
    "magazines",
];

const mainContent = document.getElementById("content");

const render = (element) => {
    mainContent.replaceChildren(element);
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

const renderChangePassword = async () => {
    const form = document.createElement("form");
    form.action = "/admin/change-password";
    form.method = "post";

    const originalPasswordLabel = createLabelForInput("Parola actuală:", "original");
    const originalPasswordInput = createInputField("password", "original");
    const passwordLabel = createLabelForInput("Parola nouă:", "password");
    const passwordInput = createInputField("password", "password");
    const confirmPasswordLabel = createLabelForInput("Confirmă parola:", "password");
    const confirmPasswordInput = createInputField("password", "confirm-password");
    const submitButton = createInputField("submit");
    submitButton.textContent = "Schimbă";

    const validateSamePassword = () => {
        if (passwordInput.value != confirmPasswordInput.value) {
            confirmPasswordInput.setCustomValidity("Parolele sunt diferite");
        } else {
            confirmPasswordInput.setCustomValidity("");
        }
    }

    passwordInput.onchange = validateSamePassword;
    confirmPasswordInput.onkeyup = validateSamePassword;

    form.appendChild(originalPasswordLabel);
    form.appendChild(originalPasswordInput);
    form.appendChild(passwordLabel);
    form.appendChild(passwordInput);
    form.appendChild(confirmPasswordLabel);
    form.appendChild(confirmPasswordInput);
    form.appendChild(submitButton);
    render(form);
}

const renderUsers = async (usersJSON) => {
    const table = document.createElement("table");
    const headerRow = createRow(["Nume de utilizator", "Acțiuni"]);
    table.appendChild(headerRow);
    for (user of usersJSON) {
        const row = createRow([user.id]);
        table.appendChild(row);
    }
    render(table)
}

const renderActivity = async (activityJSON) => {
    const table = document.createElement("table");
    const headerRow = createRow(["Data", "Utilizator", "Acțiune", "Obiect"]);
    table.appendChild(headerRow);
    for (activity of activityJSON) {
        const row = createRow([activity.timestamp, activity.user_id, activity.action, activity.target]);
        table.appendChild(row);
    }
    render(table)
}

const renderArticles = async (articleJSON) => {
    const table = document.createElement("table");
    const headerRow = createRow(["Titlu", "Autori", "Stadiu", "Data publicării", "Acțiuni"]);
    table.appendChild(headerRow);

    for (article of articleJSON) {
        const titleLink = document.createElement("a");
        titleLink.textContent = article.title;
        titleLink.href = "/articles/" + article.id;
        const modifyButton = createActionButton("/admin/articles/" + article.id, "modifică", askForConfirmation=false);

        const row = createRow([titleLink, article.authors.join(", "), article.stage, article.date, modifyButton]);
        table.appendChild(row);
    }
    render(table)
}

const renderMagazines = async (magazinesJSON) => {
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
    render(table)
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

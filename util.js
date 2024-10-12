const fs = require("fs");

/**
 * @param {string} path
 * @returns {Promise<boolean>}
 */
const fileExists = async (path) => {
    return fs.promises.access(path, fs.constants.F_OK)
        .then(() => true)
        .catch(() => false)
}

/**
 * @param {Date} date - Date to format
 * @returns {Promise<string>} - Date formatted YYYY-MM-DD
 */
const formatDate = async (date) => {
    return new Promise((resolve) => {
        let yyyy = date.getFullYear();
        let mm = date.getMonth() + 1; if (mm < 10) mm = `0${mm}`;
        let dd = date.getDate(); if (dd < 10) dd = `0${dd}`;
        return resolve(`${yyyy}-${mm}-${dd}`);
    })
}

module.exports = {
    fileExists,
    formatDate,
}

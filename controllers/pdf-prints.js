const fs = require("fs");

const { PDFPrint} = require("../models/types.js");
const { PDFPrintsDatabase } = require("../models/pdf-prints.js");

const {
    PDFPRINT_DATABASE_PATH,
    PDFPRINT_CONTENTS_PATH,
    PDFPRINT_THUMBNAILS_PATH,
} = require("../config.js");

const pdfprintDatabase = new PDFPrintsDatabase(PDFPRINT_DATABASE_PATH);
pdfprintDatabase.init();

const get_adminPDFprintPage = async (_, res) => {
    res.render("pdfprints");
}

const post_adminAddPDFprintPage = async (req, res) => {
    res.sendStatus(200);
}

module.exports = {
    get_adminPDFprintPage,
    post_adminAddPDFprintPage,
};

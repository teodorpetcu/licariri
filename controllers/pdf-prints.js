const fs = require("fs");
const pdf2img = require("pdf-img-convert")

const { PDFPrint } = require("../models/types.js");
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
    let timestamp = new Date(req.body.date).getTime();
    let description = req.body.description;
    let pdffile = req.files ? req.files.pdffile : undefined;
    const pdfprint = new PDFPrint(timestamp, description);

    if (pdffile && /pdf$/.test(pdffile.mimetype)) {
        pdfprintDatabase.addPDFPrint(pdfprint);
        const pdffilepath = `${PDFPRINT_CONTENTS_PATH}/${pdfprint.filename}`;
        fs.writeFileSync(pdffilepath, pdffile.data);
        const thumbnail = (await pdf2img.convert(pdffile.data,
            conversion_config = {
                height: 750,
                page_numbers: [1],
            }))[0];
        fs.writeFileSync(`${PDFPRINT_THUMBNAILS_PATH}/${pdfprint.description}.png`, thumbnail);
        res.sendStatus(200);
    } else {
        res.sendStatus(500);
    }
}

module.exports = {
    get_adminPDFprintPage,
    post_adminAddPDFprintPage,
};

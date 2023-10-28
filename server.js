const express = require("express");
const path = require("path");

const app = express();
const webaddress = "http://localhost";
const port = 8000;

app.use(express.static(__dirname + '/public'))

app.get('/', (_, res) => {
    res.sendFile(path.join(__dirname, "/pages/template-article.html"))
})

app.listen(port, () => {
    console.log(`Web server ready (${webaddress}:${port})`)
})

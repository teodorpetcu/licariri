const sqlite3 = require("sqlite3");

class Database {
    /**
    * Open an SQLITE connection to the given path
    * @param {string} path
     */
    constructor(path) {
        this.path = path;
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                console.error(err)
            } else {
                console.log(`database '${this.path}': ok`);
            }
        })
    }
}

module.exports = {
    Database,
};

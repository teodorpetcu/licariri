const sqlite3 = require("sqlite3");

class UsersDatabase {
    /**
     * Interface to a database holding authentication information
     * @param {string} path
     */
    constructor(path) {
        this.path = path;
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                console.error(err);
            } else {
                console.log(`User database '${path}': ok`)
            }
        })
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    init() {
        this.db.exec(`CREATE TABLE IF NOT EXISTS users
            (
                id          TEXT NOT NULL,
                password    TEXT NOT NULL,
                salt        TEXT NOT NULL,
                UNIQUE (user_id)
            )`
        );
    }
}

module.exports.UsersDatabase = UsersDatabase;

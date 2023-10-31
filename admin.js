const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt")
const HASH_COST = 15;

/**
 * Hash the given plain-text password using bcrypt
 * @param {string} password - Password in plain text
 * @returns {Promise<string>} - bcrypt-hashed password
 */
const hashPassword = async (password) => {
    return bcrypt.hash(password, HASH_COST);
}

/**
 * Check if hashing the given password produces the given hash
 * @param {string} password - Password in plain text
 * @paraam {string} hash - Hash of the password we're comparing against
 * @returns {Promise<boolean>}
 */
const validatePassword = async (password, hash) => {
    return bcrypt.compare(password, hash);
}

class UsersDatabase {
    /**
     * Interface to a database holding authentication information
     * @param {string} path
     */
    constructor(path) {
        this.path = path;
        this.db = new sqlite3.Database(path, (err) => {
            if (err) {
                // TODO: handle error
                console.error(err);
            } else {
                console.log(`User database '${path}': ok`)
            }
        })
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    // TODO: return status
    init() {
        this.db.exec(`CREATE TABLE IF NOT EXISTS users
            (
                id          TEXT NOT NULL,
                password    TEXT NOT NULL,
                UNIQUE (id)
            )`
        );
    }

    /**
     * Add an user's metadata to the database
     * @param {string} id - ID of the user
     * @param {string} pass - Plain-text password
     */
    //TODO: return status
    //TODO: handle eventual errors
    async add_user(id, pass) {
        let hash = await hashPassword(pass);
        this.db.exec(`INSERT INTO users VALUES('${id}', '${hash}')`)
    }

    /**
     * Check if the given ID-password combination matches with what we have in
     * the database
     * @param {string} id - ID of the user
     * @param {string} pass - Plain-text password
     * @returns {Promise<boolean>}
     */
    async is_correct_login_combo(id, pass) {
        return new Promise((resolve, _) => {
            return this.db.get(`SELECT * FROM users WHERE id = '${id}'`, (err, row) => {
                if (err) {
                    // TODO: handle
                    console.error(err);
                } else if (row == undefined) {
                    // ID does not exist in the database, but it makes no
                    // difference when we're trying to authenticate
                    return resolve(false);
                } else {
                    return resolve(validatePassword(pass, row.password));
                }
            });
        })
    }
}

module.exports.UsersDatabase = UsersDatabase;

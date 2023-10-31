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
                UNIQUE (user_id)
            )`
        );
    }

    /**
     * Add an user's metadata to the database
     * @param {string} id
     * @param {string} pass - hashed password
     */
    add_user(id, pass) {

    }
}

module.exports.UsersDatabase = UsersDatabase;

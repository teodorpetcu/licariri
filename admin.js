const sqlite3 = require("sqlite3");

const bcrypt = require("bcrypt");
const HASH_COST = 15;

const crypto = require("crypto"); // for randomBytes
const SESSION_TOKEN_LENGTH = 64; // bytes

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

class Session {
    constructor(user,
                token = crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex"),
                timestamp = Date.now()) {
        this.user = user;
        this.token = token;
        this.timestamp = timestamp;
    }
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
                console.log(`User database '${this.path}': ok`)
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
            );
            CREATE TABLE IF NOT EXISTS sessions
            (
                user        TEXT NOT NULL,
                token       TEXT NOT NULL,
                timestamp   INT,
                FOREIGN KEY (user) REFERENCES users (id)
            )`, (err) => {
                if (err) {
                    console.error(err);
                } else {
                    console.log(`User database '${this.path}' tables: ok`)
                }
            }
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
                    //
                    // That being said, we're still going to wait, so as to not
                    // make the end-user realise that the ID doesn't exist
                    return setTimeout(() => resolve(false), 2 * 1000); // 2sec
                } else {
                    return resolve(validatePassword(pass, row.password));
                }
            });
        })
    }

    /**
     * Save the given session in the database
     * @param session {Session}
     */
    // TODO: return status
    async add_session(session) {
        this.db.exec(`INSERT INTO sessions
            VALUES ('${session.user}', '${session.token}', '${session.timestamp}')`)
    }

    /**
     * Check if there is an existing session with the given token.
     * @param {string} token - Token of the session
     * @returns {Promise<boolean>}
     */
    // TODO: sanitise
    async has_session(token) {
        return new Promise((resolve)=> {
            this.db.get(`SELECT * FROM sessions WHERE token = '${token}'`, (err, row) => {
                if (err) {
                    console.error(err);
                } else if (row === undefined) {
                    return resolve(false);
                } else {
                    return resolve(true);
                }
            })
        });
    }
}

module.exports.UsersDatabase = UsersDatabase;
module.exports.Session = Session;

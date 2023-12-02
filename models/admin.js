const bcrypt = require("bcrypt");
const crypto = require("crypto"); // for randomBytes

const { Database } = require("./database.js");

const { HASH_COST, SESSION_TOKEN_LENGTH } = require("../config.js");
const { logger } = require("../logger.js");

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

class User {
    /**
     * @param {string} id
     * @param {string} name
     * @param {number} privilege
     */
    constructor(id, name, privilege) {
        this.id = id;
        this.name = name;
        this.privilege = privilege;
    }
}

class Session {
    /**
     * @param {string} user_id
     * @param {string} token - Optional; default: random bytes
     * @param {Date} timestamp - Optional; default: current Unix time
     */
    constructor(user_id,
                token = crypto.randomBytes(SESSION_TOKEN_LENGTH).toString("hex"),
                timestamp = Date.now()) {
        this.user_id = user_id;
        this.token = token;
        this.timestamp = timestamp;
    }
}

class UsersDatabase extends Database {
    /**
     * Interface to a database holding authentication information
     * @param {string} path
     */
    constructor(path) {
        super(path);
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    // TODO: return status
    init = () => {
        this.db.exec(`CREATE TABLE IF NOT EXISTS users
            (
                id          TEXT NOT NULL,
                name        TEXT NOT NULL,
                privilege   INT,
                password    TEXT NOT NULL,
                UNIQUE (id)
            );
            CREATE TABLE IF NOT EXISTS sessions
            (
                user        TEXT NOT NULL,
                token       TEXT NOT NULL,
                timestamp   INT,
                FOREIGN KEY (user) REFERENCES users (id)
            );`, (err) => {
                if (err) {
                    logger.error(`database '${this.path}' tables: ${err}`);
                } else {
                    logger.info(`database '${this.path}' tables: ok`);
                }
            }
        );
    }

    /**
     * Add an user's metadata to the database
     * @param {User} user - User object
     * @param {string} pass - Plain-text password
     */
    //TODO: return status
    //TODO: handle eventual errors
    addUser = async (user, pass) => {
        let hash = await hashPassword(pass);
        this.db.run('INSERT INTO users VALUES(?, ?, ?, ?)', [user.id, user.name, user.privilege, hash]);
    }

    /**
     * Change the given user's password
     * @param {User} user - User object
     * @param {string} pass - Plain-text password
     */
    changePassword = async (user, pass) => {
        let hash = await hashPassword(pass);
        this.db.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id]);
    }

    /**
     * Check if the given ID-password combination matches with what we have in
     * the database
     * @param {string} id - ID of the user
     * @param {string} pass - Plain-text password
     * @returns {Promise<boolean>}
     */
    isCorrectLoginCombo = async (id, pass) => {
        return new Promise((resolve) => {
            return this.db.get('SELECT * FROM users WHERE id = ?', [id], (err, row) => {
                if (err) {
                    // TODO: handle
                    logger.error(`couldn't access '${this.path}': ${err}`);
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
    addSession = async (session) => {
        this.db.run('INSERT INTO sessions VALUES (?, ?, ?)',
            [session.user_id, session.token, session.timestamp]);
    }

    /**
     * Return the User that the given token belongs to, or undefined if there is
     * no such session.
     * @param {string} token - Token of the session
     * @returns {Promise<User|undefined>}
     */
    // Hopefully this does not take too much time to do for every request?
    getSessionUser = async (token) => {
        return new Promise((resolve)=> {
            this.db.get('SELECT * FROM users WHERE id IN (SELECT user FROM sessions WHERE token = ?)', [token], (err, row) => {
                if (err) {
                    logger.error(`couldn't access '${this.path}': ${err}`);
                    return resolve(undefined);
                } else if (row === undefined) {
                    return resolve(undefined);
                } else {
                    return resolve(new User(row.id, row.name, row.privilege));
                }
            })
        });
    }
}

module.exports = {
    User,
    UsersDatabase,
    Session,
};

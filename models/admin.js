const bcrypt = require("bcrypt");
const crypto = require("crypto"); // for randomBytes

const { Database } = require("./database.js");

const { HASH_COST, SESSION_TOKEN_LENGTH, USERS_DATABASE_PATH } = require("../config.js");
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
     * @param {number} privilege
     * @param {bool} suspended
     */
    constructor(id, privilege, suspended = 0) {
        this.id = id;
        this.privilege = privilege;
        this.suspended = suspended;
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

class Activity {
    /**
     * @param {string} user_id
     * @param {string} action
     * @param {string} target
     * @param {Date} timestamp - Optional
     */
    constructor(user_id, action, target, timestamp = new Date()) {
        this.user_id = user_id;
        this.action = action;
        this.target = target;
        this.timestamp = timestamp.valueOf();
    }
}

class UsersDatabase extends Database {
    /**
     * Interface to a database holding authentication information
     * @param {string} path
     */
    constructor(path) {
        super(path);
        this.name = "admin";
    }

    /**
     * Initialise the database tables if they haven't already been created
     * @returns {Promise<undefined>}
     */
    init = async () => {
        return this.exec(
            `CREATE TABLE IF NOT EXISTS users
            (
                id          TEXT NOT NULL,
                privilege   INT,
                suspended   INT,
                password    TEXT NOT NULL,
                UNIQUE (id)
            );
            CREATE TABLE IF NOT EXISTS sessions
            (
                user        TEXT NOT NULL,
                token       TEXT NOT NULL,
                timestamp   INT,
                UNIQUE(token),
                FOREIGN KEY (user) REFERENCES users (id)
            );
            CREATE TABLE IF NOT EXISTS activity
            (
                timestamp   INT,
                user        TEXT NOT NULL,
                action      TEXT NOT NULL,
                target      TEXT,
                FOREIGN KEY (user) REFERENCES users (id)
            );`
        )
            .then(() => logger.info(`database '${this.path}' tables: ok`))
            .catch((err) => this.errorLogger(`database '${this.path}' tables: ${err}`));
        // `activity` table action types:
        //      ["modify", "rename", "publish", "draft", "trash"] articles
        //      ["adduser", "suspenduser", "unsuspenduser"] user
        //      ["addpdfprint", "rmpdfprint"] pdfprint
    }

    /**
     * Add an user's metadata to the database
     * @param {User} user - User object
     * @param {string} pass - Plain-text password
     */
    addUser = async (user, pass) => {
        let hash = await hashPassword(pass);
        return this.run('INSERT INTO users VALUES(?, ?, ?, ?)', [user.id, user.privilege, user.suspended, hash])
            .catch((err) => this.errorLogger(`adding user '${user}': ${err}`));
    }

    /**
     * Change the given user's password
     * @param {User} user - User object
     * @param {string} pass - Plain-text password
     */
    changePassword = async (user, pass) => {
        let hash = await hashPassword(pass);
        return this.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id])
            .catch((err) => this.errorLogger(`changing password for '${user}': ${err}`));
    }

    /**
     * Check if the given ID-password combination matches with what we have in
     * the database
     * @param {string} id - ID of the user
     * @param {string} pass - Plain-text password
     * @returns {Promise<boolean>}
     */
    isCorrectLoginCombo = async (id, pass) => {
        return this.get('SELECT * FROM users WHERE id = ?', [id])
            .then((row) => {
                return validatePassword(pass, row.password);
            })
            .catch((err) => {
                this.errorLogger(`getting user id while trying to validate password: ${err}`);
                // Whether there was an actual error or the ID does not exist in
                // the database, it makes no difference when we're trying to
                // authenticate. That being said, we're still going to wait, so
                // as to not make the end-user realise that the ID doesn't exist
                return new Promise((resolve) => {
                    setTimeout(() => resolve(false), 2 * 1000); // 2sec
                });
            })
    }

    /**
     * Save the given session in the database
     * @param session {Session}
     */
    addSession = async (session) => {
        return this.run('INSERT INTO sessions VALUES (?, ?, ?)', [session.user_id, session.token, session.timestamp])
            .catch((err) => this.errorLogger(`adding session: ${err}`));
    }

    /**
     * Return the User that the given token belongs to, or undefined if there is
     * no such session.
     * @param {string} token - Token of the session
     * @returns {Promise<User|undefined>}
     */
    // Hopefully this does not take too much time to do for every request?
    getSessionUser = async (token) => {
        return this.get('SELECT * FROM users WHERE id IN (SELECT user FROM sessions WHERE token = ?)', [token])
            .then((row) => {
                return new User(row.id, row.privilege, row.suspended);
            })
            .catch((err) => {
                this.errorLogger(`getting user matching session token: ${err}`);
                return undefined;
            });
    }

    /**
     * Given a session token, remove its record from the `sessions` table, thus
     * effectively making it unusable and logging the user off
     * @param {string} token
     */
    removeSession = async (token) => {
        return this.run(`DELETE FROM sessions WHERE token = ?`, [token])
            .catch((err) => this.errorLogger(`removing session: ${err}`));
    }

    /**
     * Return all sessions in the database, regardless of user or timestamp
     * @return {Promise<Session[]|undefined>}
     */
    getAllSessions = async () => {
        return this.all('SELECT * FROM sessions', [])
            .then((rows) => {
                return rows.map((row) => new Session(row.user_id, row.token, new Date(row.timestamp)));
            })
            .catch((err) => {
                this.errorLogger(`getting all user sessions: ${err}`);
                return undefined;
            })
    }

    /**
     * Add a record to the `activity` table
     * @param {User} user
     * @param {string} action
     * @param {string} target
     */
    addActivity = async (user, action, target) => {
        return this.run('INSERT INTO activity VALUES (?, ?, ?, ?)', [Date.now(), user.id, action, target])
            .catch((err) => this.errorLogger(`adding user activity: ${err}`));
    }

    /**
     * For every activity of type `action`, replace `oldTarget` with
     * `newTarget`. Particularly useful for keeping proper references to article
     * IDs when they get renamed.
     * @param {string} action
     * @param {string} oldTarget
     * @param {string} newTarget
     */
    changeActivityTarget = async (action, oldTarget, newTarget) => {
        return this.run('UPDATE activity SET target = ? WHERE action = ? AND target = ?', [newTarget, action, oldTarget])
            .catch((err) => this.errorLogger(`changeActivity(${action}, ${oldTarget}, ${newTarget}): ${err}`));
    }

    /**
     * @returns {Promise<Activity[]>}
     */
    getAllActivities = async () => {
        return this.all('SELECT * FROM activity ORDER BY timestamp DESC', [])
            .then((rows)  => {
                return rows.map((row) => new Activity(row.user, row.action, row.target, new Date(row.timestamp)));
            })
            .catch((err) => {
                this.errorLogger(`getting all user activities: ${err}`);
                return [];
            });
    }

    /**
     * Return all users in the database, sorted from highest to lowest privilege
     * @param {string} token - Token of the session
     * @returns {Promise<User|undefined>}
     */
    getAllUsers = async () => {
        return this.all('SELECT * FROM users ORDER BY privilege DESC', [])
            .then((rows)  => {
                return rows.map((row) => new User(row.id, row.privilege, row.suspended));
            })
            .catch((err) => {
                if (err === undefined) {
                    this.errorLogger("getAllUsers() rows undefined");
                } else {
                    this.errorLogger(`getting all users: ${err}`);
                }
                return undefined;
            });
    }

    /**
     * @param {string} articleID
     * @returns {Promise<Activity[]>}
     */
    getArticleModifications = async (articleID) => {
        return this.all(`SELECT * FROM activity WHERE action = ? AND target = ? ORDER BY timestamp DESC`,
                                                        ["modify", articleID])
            .then((rows) => {
                return rows.map((row) => new Activity(row.user, row.action, row.target, row.timestamp));
            })
            .catch((err) => {this.errorLogger(`getting article modifications: ${err}`); return []});
    }

    suspendUser = async (userID) => {
        return this.run(`UPDATE users SET suspended = 1 WHERE id = ?`, [userID])
            .catch((err) => this.errorLogger(`suspending user '${userID}': ${err}`));
    }

    unSuspendUser = async (userID) => {
        return this.run(`UPDATE users SET suspended = 0 WHERE id = ?`, [userID])
            .catch((err) => this.errorLogger(`un-suspending user '${userID}': ${err}`));
    }
}

const usersDatabase = new UsersDatabase(USERS_DATABASE_PATH);

module.exports = {
    usersDatabase,
    User,
    Session,
    Activity,
};

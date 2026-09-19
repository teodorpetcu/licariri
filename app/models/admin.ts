// Copyright (C) 2026  Teodor Petcu  <petcuteodor03@gmail.com>
// This file is part of licariri.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published
// by the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

import bcrypt from "bcrypt";

import { newUser, newSession, newActivity, type User, type Session, type Activity, type UserActivityAction } from "./types.ts";
import { Database } from "./database.ts";

import { HASH_COST, DATABASE_PATH } from "../config.ts";

/**
 * Hash the given plain-text password using bcrypt
 */
const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, HASH_COST);
}

/**
 * Check if hashing the given password produces the given hash
 */
const validatePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
}

export class UsersDatabase extends Database {
    constructor(path: string) {
        super(path);
        this.name = "admin";
    }

    /**
     * Initialise the database tables if they haven't already been created
     */
    public init = async (): Promise<void> => {
        return await this.exec(
            `CREATE TABLE IF NOT EXISTS users
            (
                id          TEXT NOT NULL,
                role        TEXT NOT NULL,
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
    }

    /**
     * Add an user's metadata to the database
     */
    public addUser = async (user: User, pass: string): Promise<void> => {
        const hash = await hashPassword(pass);
        return await this.run('INSERT INTO users VALUES(?, ?, ?, ?)', [user.id, user.role, user.suspended, hash])
            .catch((err) => {
                this.dbLogger.error(err, `adding user '${user}'`);
                return Promise.reject(err);
            });
    }

    /**
     * Change the given user's password
     */
    public changePassword = async (user: User, pass: string): Promise<void> => {
        const hash = await hashPassword(pass);
        return this.run('UPDATE users SET password = ? WHERE id = ?', [hash, user.id])
            .catch((err) => {
                this.dbLogger.error(err, `changing password for '${user}'`);
                return Promise.reject(err);
            });
    }

    /**
     * Check if the given ID-password combination matches with what we have in
     * the database
     */
    public isCorrectLoginCombo = async (id: string, pass: string): Promise<boolean> => {
        return await this.get<User>('SELECT * FROM users WHERE id = ?', [id])
            .then((row) => {
                return validatePassword(pass, row.password!);
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting user id while trying to validate password");
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
     */
    public addSession = async (session: Session): Promise<void> => {
        return await this.run('INSERT INTO sessions VALUES (?, ?, ?)', [session.user_id, session.token, session.timestamp])
            .catch((err) => {
                this.dbLogger.error(err, "adding session");
                return Promise.reject(err);
            });
    }

    /**
     * Return the User that the given token belongs to, or undefined if there is
     * no such session.
     */
    // Hopefully this does not take too much time to do for every request?
    public getSessionUser = async (token: string): Promise<User|undefined> => {
        return await this.get<User>('SELECT * FROM users WHERE id IN (SELECT user FROM sessions WHERE token = ?)', [token])
            .then((row) => {
                return newUser(row.id, row.role, row.suspended);
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting user matching session token");
                return undefined;
            });
    }

    /**
     * Given a session token, remove its record from the `sessions` table, thus
     * effectively making it unusable and logging the user off
     */
    public removeSession = async (token: string): Promise<void> => {
        return await this.run(`DELETE FROM sessions WHERE token = ?`, [token])
            .catch((err) => {
                this.dbLogger.error(err, "removing session");
                return Promise.reject(err);
            });
    }

    /**
     * Return all sessions in the database, regardless of user or timestamp
     */
    public getAllSessions = async (): Promise<Session[]> => {
        return await this.all<Session>('SELECT * FROM sessions', [])
            .then((rows) => {
                return rows.map((row) => newSession(row.user_id, row.token, row.timestamp));
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting all user sessions");
                return Promise.reject(err);
            })
    }

    /**
     * Add a record to the `activity` table
     */
    public addActivity = async (user: User, action: UserActivityAction, target: string): Promise<void> => {
        return await this.run('INSERT INTO activity VALUES (?, ?, ?, ?)', [Date.now(), user.id, action, target])
            .catch((err) => {
                this.dbLogger.error(err, "adding user activity");
                return Promise.reject(err);
            });
    }

    /**
     * For every activity of type `action`, replace `oldTarget` with
     * `newTarget`. Particularly useful for keeping proper references to article
     * IDs when they get renamed.
     */
    public changeActivityTarget = async (action: UserActivityAction, oldTarget: string, newTarget: string): Promise<void> => {
        return await this.run('UPDATE activity SET target = ? WHERE action = ? AND target = ?', [newTarget, action, oldTarget])
            .catch((err) => {
                this.dbLogger.error(err, `changeActivity(${action}, ${oldTarget}, ${newTarget})`);
                return Promise.reject(err);
            });
    }

    public getAllActivities = async (): Promise<Activity[]> => {
        return await this.all<Activity>('SELECT * FROM activity ORDER BY timestamp DESC', [])
            .then((rows)  => {
                return rows.map((row) => newActivity(row.user, row.action, row.target, new Date(row.timestamp)));
            })
            .catch((err) => {
                this.dbLogger.error(err, "getting all user activities");
                return Promise.reject(err);
            });
    }

    /**
     * Return all users in the database, ordered by role
     */
    public getAllUsers = async (): Promise<User[]> => {
        return await this.all<User>('SELECT * FROM users ORDER BY role', [])
            .then((rows)  => {
                return rows.map((row) => newUser(row.id, row.role, row.suspended));
            })
            .catch((err) => {
                if (err === undefined) {
                    this.dbLogger.error(Error("getAllUsers() rows undefined"), "getting all users");
                } else {
                    this.dbLogger.error(err, `getting all users`);
                }
                return Promise.reject(err);
            });
    }

    public getArticleModifications = async (articleID: string): Promise<Activity[]> => {
        return await this.all<Activity>(`SELECT * FROM activity WHERE action = ? AND target = ? ORDER BY timestamp DESC`,
                                                        ["modify", articleID])
            .then((rows) => {
                return rows.map((row) => newActivity(row.user, row.action, row.target, new Date(row.timestamp)));
            })
            .catch((err) => {
                this.dbLogger.error(err, `getting article modifications`);
                return Promise.reject(err);
            });
    }

    public suspendUser = async (userID: string): Promise<void> => {
        return await this.run(`UPDATE users SET suspended = 1 WHERE id = ?`, [userID])
            .catch((err) => {
                this.dbLogger.error(err, `suspending user '${userID}'`);
                return Promise.reject(err);
            });
    }

    public unSuspendUser = async (userID: string): Promise<void> => {
        return await this.run(`UPDATE users SET suspended = 0 WHERE id = ?`, [userID])
            .catch((err) => {
                this.dbLogger.error(err, `un-suspending user '${userID}'`);
                return Promise.reject(err);
            });
    }
}

const usersDatabase = new UsersDatabase(DATABASE_PATH);
export default usersDatabase;

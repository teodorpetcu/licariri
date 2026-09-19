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

import sqlite3 from "sqlite3";

import { logger } from "../services/logger.ts";

const BUSY_TIMEOUT_MS = 3000; // 3 seconds

export interface Database {
    path: string;
    name: string;
    db: sqlite3.Database | undefined;
}

export class Database {
    /**
     * Open an SQLITE connection to the given path
     */
    constructor(path: string) {
        this.path = path;
        this.db = undefined;
    }

    public open = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.path, (err) => {
                if (err) {
                    return reject(err);
                } else if (this.db) {
                    this.db.configure("busyTimeout", BUSY_TIMEOUT_MS);
                    return resolve();
                }
            })
        })
    }

    public close = (): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (! this.db) return reject("Cannot close database connection; connection not even open");
            this.db.close((err) => {
                if (err) {
                    return reject(err);
                } else {
                    this.db = undefined;
                    return resolve();
                }
            });
        })
    }

    public dbLogger = {
        info: (msg: string) => {
            return logger.info(`(database '${this.name}') ${msg}`);
        },
        error: (err: Error, context?: string) => {
            return logger.error(err, `(database '${this.name}') ${context}`);
        },
    }

    public get = async <T>(stmt: string, data?: object): Promise<T> => {
        return await new Promise((resolve, reject) => {
            if (! this.db) return reject("Cannot access database; connection not open");
            this.db.get<T>(stmt, data, (err, row) => {
                if (err) {
                    return reject(err);
                } else if (row === undefined) {
                    return reject("Database row is undefined");
                } else {
                    return resolve(row);
                }
            })
        })
    }

    public all = <T>(stmt: string, data?: object): Promise<T[]> => {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Cannot access database; connection not open");
            this.db.all<T>(stmt, data, (err, rows) => {
                if (err) {
                    reject(err);
                } else if (rows === undefined) {
                    return reject("Database rows are undefined");
                } else {
                    return resolve(rows);
                }
            })
        })
    }

    public run = (stmt: string, data?: object): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Cannot run statement in database; connection not open");
            this.db.run(stmt, data, (err) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            })
        })
    }

    public exec = (stmt: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!this.db) return reject("Cannot exec statement in database; connection not open");
            this.db.exec(stmt, (err) => {
                if (err) {
                    return reject(err);
                } else {
                    return resolve();
                }
            })
        })
    }
}

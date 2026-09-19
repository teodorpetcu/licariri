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

import winston, { type Logger } from "winston";
import { type Request, type Response, type NextFunction } from "express";

const logFormat = winston.format.combine(
    winston.format.errors({stack: true}),
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.printf(({timestamp, level, message}) => `[${timestamp}] ${level}: ${message}`)
);

const consoleTransport = new winston.transports.Console({
    format: winston.format.combine(
        logFormat,
    )
});

const _logger: Logger = winston.createLogger({
    level: "info",
    format: logFormat,
    transports: [
        consoleTransport,
    ],
});

export const logger = {
    info: (msg: string) => _logger.info(msg),
    security: (msg: string) => _logger.info(msg),
    // having a context makes it easier to locate the whereabouts of the error,
    // as well as not logging false positives (after a promise, the error itself
    // may be undefined, even if it is caught; if simply appending the error to
    // the context, an undefined error may get printed out)
    error: (err: Error, context?: string) => {
        if (err) {
            _logger.error(`${context}: ${err}`);
        }
    },
}

/**
 * Middleware: log where this request came from, and what it wants
 */
export const requestLogger = (req: Request, _res: Response, next: NextFunction) => {
    logger.info(`${req.ip} ${req.method} ${req.url}`);
    next();
}

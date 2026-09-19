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

import { Request, Response, NextFunction } from "express";

import { COOKIE_OPTIONS } from "../config.ts";
import usersDatabase from "../models/admin.ts";
import { newUser, newSession, type UserRole, type Activity } from "../models/types.ts";
import { logger } from "../services/logger.ts";
import { formatDate, prefixLessThanTen } from "../utils/util.ts";

const MILISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;

/**
 * Middleware: look at the cookies on the request and attach user information to
 * `req.user`, if the session token is valid, or `undefined`, if invalid.
 */
export const identifyAuthorisedUser = async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const sessionCookie = req.cookies.session;
    req.user = await usersDatabase.getSessionUser(sessionCookie);
    next();
}

/**
 * Must be used after `identifyAuthorisedUser`
 */
export const forbidUnauthorised = (req: Request, res: Response, next: NextFunction): void => {
    if (req.user) {
        if (req.user.suspended) {
            res.status(401).send("Ne pare rău, contul tău a fost suspendat.");
            usersDatabase.removeSession(req.cookies.session);
        } else {
            next();
        }
    } else {
        res.status(404).render("404");
    }
}

/**
 * Split the given array into multiple arrays of length equal to `pageSize`; if
 * the array's length isn't divisible by `pageSize`, then the last array
 * contains all the remainder elements.
 */
const paginate = (arr: Array<any>, pageSize: number): Array<any> => {
    return Array.from({ length: Math.ceil(arr.length / pageSize) }, (_, i) =>
        arr.slice(i * pageSize, i * pageSize + pageSize)
    )
}

export const get_adminLoginPage = (req: Request, res: Response): void => {
    if (req.user) {
        res.redirect("/admin");
    } else {
        res.render("login", {});
    }
}

export const get_adminPage = (req: Request, res: Response): void => {
    if (req.user) {
        let canManageOtherUsers = false;
        if (req.user.role == "administrator") {
            canManageOtherUsers = true;
        }
        res.render("admin", {user: req.user, canManageOtherUsers});
    } else {
        res.redirect("/login");
    }
}

export const post_adminAPI_loginCheck = async (req: Request, res: Response): Promise<void> => {
    const id = req.body.username;
    const pass = req.body.password;
    const rememberMe = req.body.remember_me;
    const cookieOptions = COOKIE_OPTIONS;
    if (await usersDatabase.isCorrectLoginCombo(id, pass)) {
        const session = newSession(id);
        usersDatabase.addSession(session).then(() => {
            if (rememberMe == "on") {
                cookieOptions.maxAge = 28 * MILISECONDS_IN_A_DAY; // 4 weeks
            }
            logger.security(`${req.ip} login SUCCESS as user '${id}'`);
            res.cookie("session", session.token, cookieOptions);
            res.redirect("/admin");
        }).catch((err) => {
            logger.error(err, "could not add session to user database");
            res.sendStatus(500);
        })
    } else {
        logger.security(`${req.ip} login FAIL as user '${id}'`);
        res.redirect("/login");
    }
}

export const post_adminAPI_logout = (req: Request, res: Response): void => {
    usersDatabase.removeSession(req.cookies.session);
    res.clearCookie("session");
    res.redirect("/login")
}

export const post_adminAPI_addUser = (req: Request, res: Response): void => {
    if (req.user.role != "administrator") {
        res.sendStatus(401);
    } else {
        let role = req.body.role;
        if (role ! satisfies UserRole) role = "editor";
        const user = newUser(req.body.id, role);
        usersDatabase.addUser(user, req.body.password);
        usersDatabase.addActivity(req.user, "adduser", user.id); // NOTE: req.user =/= user
        res.sendStatus(200);
    }
}

export const post_adminAPI_changeUserPassword = async (req: Request, res: Response): Promise<void> => {
    if (await usersDatabase.isCorrectLoginCombo(req.user.id, req.body.original)) {
        await Promise.all([
            usersDatabase.changePassword(req.user, req.body.password),
            usersDatabase.addActivity(req.user, "changepassword", "self"),
        ])
            .catch(logger.error)
            .finally(() => res.sendStatus(200))
    } else {
        res.sendStatus(401);
    }
}

export const post_adminAPI_suspendUser = (req: Request, res: Response): void => {
    const userID = req.body.id;
    const suspend = req.body.suspend;
    if (req.user.role != "administrator") {
        res.status(404).render("404");
    } else {
        if (suspend == 1) {
            usersDatabase.addActivity(req.user, "suspendUser", userID);
            usersDatabase.suspendUser(userID);
        } else {
            usersDatabase.addActivity(req.user, "unSuspendUser", userID);
            usersDatabase.unSuspendUser(userID);
        }
        res.sendStatus(200);
    }
}

// very dirty quick fix
const activityToHumanReadable = (activity: Activity): {
    user: string,
    action: string,
    target: string,
    timestamp: string,
} => {
    let humanReadableAction = "";
    if (activity.action == "modify")  {
        humanReadableAction = `a modificat articolul`;
    } else if (activity.action == "rename") {
        const [oldName, newName] = activity.target.split("::");
        humanReadableAction = `a schimbat numele articolului`;
        activity.target = `${oldName} ÎN ${newName}`
    } else if (activity.action == "publish") {
        humanReadableAction = `a publicat articolul`;
    } else if (activity.action == "draft") {
        humanReadableAction = `a pus articolul în SCHIȚE`;
    } else if (activity.action == "trash") {
        humanReadableAction = `a pus articolul în COȘUL DE GUNOI`;
    } else if (activity.action == "adduser") {
        humanReadableAction = `a adăugat utilizatorul`;
    } else if (activity.action == "suspendUser") {
        humanReadableAction = `a suspendat utilizatorul`;
    } else if (activity.action == "unSuspendUser") {
        humanReadableAction = `a eliminat suspendarea utilizatorului`;
    } else if (activity.action == "addmagazine") {
        humanReadableAction = `a adăugat ediția print a revistei`;
    } else if (activity.action == "rmmagazine") {
        humanReadableAction = `a șters ediția print a revistei`;
    }
    const t = new Date(activity.timestamp);
    const hours = prefixLessThanTen(t.getHours());
    const min = prefixLessThanTen(t.getMinutes());
    const sec = prefixLessThanTen(t.getSeconds());
    return {
        user: activity.user,
        action: humanReadableAction,
        target: activity.target,
        timestamp: `${formatDate(t)} ${hours}:${min}:${sec}`,
    };
}

export const get_adminAPI_users = async (_: Request, res: Response): Promise<void> => {
    const users = await usersDatabase.getAllUsers();
    res.send(users);
}

export const get_adminAPI_activity = async (_: Request, res: Response): Promise<void> => {
    const activity = await usersDatabase.getAllActivities();
    const human_readable = await Promise.all(activity.filter((a) => a.action != "changepassword").map((a) => activityToHumanReadable(a)));
    res.send(human_readable);
}

import { expect } from "@std/expect";
import { UsersDatabase } from "./admin.ts";
import { newUser, newSession } from "./types.ts";

let testUsersDB: UsersDatabase;

Deno.test.beforeAll(async () => {
    testUsersDB = new UsersDatabase(":memory:");
    await testUsersDB.open().then(() => testUsersDB.init());
})

Deno.test.beforeEach(async () => {
    // nuke the test database
    await testUsersDB.exec("DELETE FROM users");
    await testUsersDB.exec("DELETE FROM sessions");
    await testUsersDB.exec("DELETE FROM activity");
})

Deno.test.afterAll(async () => {
    await testUsersDB.close();
})

Deno.test("UsersDatabase: user operations", async (t) => {
    const user = newUser("foo", "editor");
    const passwd = "barpasswd";
    const session = newSession(user.id);

    await t.step("addUser", async () => {
        await expect(testUsersDB.addUser(user, passwd)).resolves.toBeUndefined();
    })
    await t.step("isCorrectLoginCombo", async () => {
        await expect(testUsersDB.isCorrectLoginCombo(user.id, passwd)).resolves.toBe(true);
    })
    await t.step("addSession", async() => {
        await expect(testUsersDB.addSession(session)).resolves.toBeUndefined();
    })
    await t.step("getSessionUser", async() => {
        await expect(testUsersDB.getSessionUser(session.token)).resolves.toEqual(user);
    })
})

Deno.test("UsersDatabase: change password", async (t) => {
    const user = newUser("foo", "editor");
    const passwd = "barpasswd";
    const newpasswd = "bazpasswd";

    await t.step("addUser", async () => {
        await expect(testUsersDB.addUser(user, passwd)).resolves.toBeUndefined();
    })
    await t.step("correct login with initial password", async () => {
        await expect(testUsersDB.isCorrectLoginCombo(user.id, passwd)).resolves.toBe(true);
    })
    await t.step("change password", async() => {
        await expect(testUsersDB.changePassword(user, newpasswd)).resolves.toBeUndefined();
    })
    await t.step("incorrect login with initial password", async() => {
        await expect(testUsersDB.isCorrectLoginCombo(user.id, passwd)).resolves.toBe(false);
    })
    await t.step("correct login with new password", async() => {
        await expect(testUsersDB.isCorrectLoginCombo(user.id, newpasswd)).resolves.toBe(true);
    })
})

Deno.test("UsersDatabase: throw error on duplicate user", async () => {
    const user = newUser("foo", "editor");
    const passwd = "barpasswd";
    await expect(testUsersDB.addUser(user, passwd)).resolves.toBeUndefined();
    await expect(testUsersDB.addUser(user, passwd)).rejects.toThrow();
    await expect(testUsersDB.getAllUsers()).resolves.toEqual([user]);
})

import { expect } from "@std/expect";
import { QueryDatabase } from "./query.ts";
import { } from "./types.ts";

let testQueryDB: QueryDatabase;

Deno.test.beforeAll(async () => {
    testQueryDB = new QueryDatabase(":memory:");
    await testQueryDB.open().then(() => testQueryDB.init());
})

Deno.test.beforeEach(async () => {
    // nuke the test database
    await testQueryDB.exec("DELETE FROM query");
})

Deno.test.afterAll(async () => {
    await testQueryDB.close();
})

const LOREM_IPSUM = "Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet. Lorem ipsum dolor sit amet, consetetur sadipscing elitr, sed diam nonumy eirmod tempor invidunt ut labore et dolore magna aliquyam erat, sed diam voluptua. At vero eos et accusam et justo duo dolores et ea rebum. Stet clita kasd gubergren, no sea takimata sanctus est Lorem ipsum dolor sit amet";

const removeInvalidCharacters = (str: string): string => {
    return str.replace(/[^0-9A-z\-'ăîâșțéèÿùüïôœàæêëûîâç]/g, " ");
}

Deno.test("QueryDatabase operations with one article", async (t) => {
    const id = "test-1";
    const contents = LOREM_IPSUM;

    await t.step("indexArticle", async () => {
        await expect(testQueryDB.indexArticle(id, contents)).resolves.toBeUndefined();
    })

    await t.step("findArticles", async () => {
        const words = removeInvalidCharacters(contents).split(/\s+/);
        for (const word of words) {
            await expect(testQueryDB.findArticles(word, true)).resolves.toEqual([id]);
        }
    })

    await t.step("unindexArticle", async () => {
        await expect(testQueryDB.unindexArticle(id)).resolves.toBeUndefined();
        const words = removeInvalidCharacters(contents).split(/\s+/);
        for (const word of words) {
            await expect(testQueryDB.findArticles(word, true)).resolves.toEqual([]);
        }
    })
})

Deno.test("QueryDatabase two articles, first gets unindexed", async (t) => {
    const id1 = "testid-removed";
    const contents1 = LOREM_IPSUM;
    const id2 = "testid-not-removed";
    const contents2 = "Foo bar baz";

    await t.step("indexArticle", async () => {
        await expect(testQueryDB.indexArticle(id1, contents1)).resolves.toBeUndefined();
        await expect(testQueryDB.indexArticle(id2, contents2)).resolves.toBeUndefined();
    })

    await t.step("unindex first article", async () => {
        await expect(testQueryDB.unindexArticle(id1)).resolves.toBeUndefined();
    })

    await t.step("findArticles should not find first article", async () => {
        const words1 = removeInvalidCharacters(contents1).split(/\s+/);
        for (const word of words1) {
            await expect(testQueryDB.findArticles(word, true)).resolves.not.toContain(id1);
        }
    })

    await t.step("findArticles finds the second article", async () => {
        const words2 = removeInvalidCharacters(contents2).split(/\s+/);
        for (const word of words2) {
            await expect(testQueryDB.findArticles(word, true)).resolves.toContain(id2);
        }
    })
})

Deno.test("QueryDatabase: don't throw on duplicate article entries", async () => {
    const id = "testid-duplicates";
    const contents = LOREM_IPSUM;
    await expect(testQueryDB.indexArticle(id, contents)).resolves.toBeUndefined();
    await expect(testQueryDB.indexArticle(id, contents)).resolves.toBeUndefined();
    const words = removeInvalidCharacters(contents).split(/\s+/);
    for (const word of words) {
        await expect(testQueryDB.findArticles(word, true)).resolves.toEqual([id]);
    }
})

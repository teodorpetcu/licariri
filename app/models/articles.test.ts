import { expect } from "@std/expect";
import { ArticleDatabase } from "./articles.ts";
import { newMagazine, newArticle, generateArticleID } from "./types.ts";

let testArticleDB: ArticleDatabase;

Deno.test.beforeAll(async () => {
    testArticleDB = new ArticleDatabase(":memory:");
    await testArticleDB.open().then(() => testArticleDB.init());
})

Deno.test.beforeEach(async () => {
    // nuke the database
    await testArticleDB.exec("DELETE FROM articles");
    await testArticleDB.exec("DELETE FROM article_styles");
    await testArticleDB.exec("DELETE FROM article_authors");
    await testArticleDB.exec("DELETE FROM article_tags");
    await testArticleDB.exec("DELETE FROM article_credits");
    await testArticleDB.exec("DELETE FROM magazines");
})

Deno.test.afterAll(async () => {
    await testArticleDB.close();
})

// FOR TESTING async (): Promise<void>
// CHECK THE EFFECT

Deno.test("ArticleDatabase: magazine operations", async (t) => {
    const magazine = newMagazine(Date.now(), "test magazine")
    await t.step("addMagazine", async () => {
        await testArticleDB.addMagazine(magazine);
        expect(await testArticleDB.getAllMagazinesSorted()).toEqual([magazine]);
    })
    await t.step("removeMagazine", async () => {
        await expect(testArticleDB.removeMagazine(magazine.description)).resolves.toBeUndefined();
        expect(await testArticleDB.getAllMagazinesSorted()).toEqual([]);
    })
})

Deno.test("ArticleDatabase: ignore duplicate magazine entries", async () => {
    const magazine = newMagazine(Date.now(), "test magazine");
    await expect(testArticleDB.addMagazine(magazine)).resolves.toBeUndefined();
    await expect(testArticleDB.addMagazine(magazine)).resolves.toBeUndefined();
    expect(await testArticleDB.getAllMagazinesSorted()).toEqual([magazine]);
})

Deno.test("ArticleDatabase: article operations", async (t) => {
    const firstArticle = newArticle({"title": "foo"});
    const secondArticle = newArticle({"title": "bar"});

    await t.step("saveArticle", async () => {
        await expect(testArticleDB.saveArticle(firstArticle)).resolves.toBeUndefined();
        expect(await testArticleDB.getArticle(firstArticle.id)).toEqual(firstArticle);
    })
    await t.step("updateArticle", async () => {
        await expect(testArticleDB.updateArticle(firstArticle.id, secondArticle)).resolves.toBeUndefined();
        expect(await testArticleDB.getArticle(firstArticle.id)).toEqual(undefined);
        const updatedVersion = await testArticleDB.getArticle(secondArticle.id);
        // preserve timestamp and date
        expect(updatedVersion?.timestamp).toEqual(firstArticle.timestamp);
        expect(updatedVersion?.stage).toEqual(firstArticle.stage);
        // otherwise, update properties
        expect(updatedVersion?.title).toEqual(secondArticle.title);
        expect(updatedVersion?.subtitle).toEqual(secondArticle.subtitle);
        expect(updatedVersion?.language).toEqual(secondArticle.language);
        expect(updatedVersion?.category).toEqual(secondArticle.category);
        expect(updatedVersion?.description).toEqual(secondArticle.description);
        expect(updatedVersion?.style).toEqual(secondArticle.style);
        expect(updatedVersion?.authors).toEqual(secondArticle.authors);
        expect(updatedVersion?.tags).toEqual(secondArticle.tags);
        expect(updatedVersion?.credits).toEqual(secondArticle.credits);
    })
    // NOTE: from now on, secondArticle.id is the proper identifier
    await t.step("updateArticleStage", async () => {
        expect(await testArticleDB.getArticle(secondArticle.id)).toHaveProperty("stage", "draft");
        secondArticle.stage = "public";
        await expect(testArticleDB.updateArticleStage(secondArticle)).resolves.toBeUndefined();
        expect(await testArticleDB.getArticle(secondArticle.id)).toHaveProperty("stage", "public");
    })
    await t.step("removeArticle", async () => {
        await expect(testArticleDB.removeArticle(secondArticle.id)).resolves.toBeUndefined();
        expect(await testArticleDB.searchArticles()).toEqual([]);
    })
})

Deno.test("ArticleDatabase: throw error on duplicate articles", async () => {
    const article = newArticle({"title": "foo"});
    await expect(testArticleDB.saveArticle(article)).resolves.toBeUndefined();
    await expect(testArticleDB.saveArticle(article)).rejects.toThrow();
})

Deno.test("ArticleDatabase: throw error on duplicate article IDs, even with different title", async () => {
    const article_1 = newArticle({"title": "f o o"});
    // on article_2, the title would be identical to the ID
    const article_2 = newArticle({"title": generateArticleID("f o o")});
    await expect(testArticleDB.saveArticle(article_1)).resolves.toBeUndefined();
    await expect(testArticleDB.saveArticle(article_2)).rejects.toThrow();
})

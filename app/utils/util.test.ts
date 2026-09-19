import { expect } from "@std/expect";
import { formatDate, fileExists } from "./util.ts";

Deno.test("formatDate 1st of january 1970", () => {
    expect(formatDate(new Date(0))).toBe("1970-01-01");
})

Deno.test("formatDate from timestamp date", () => {
    // multiplying by 1000 to convert to miliseconds
    const timestamp = new Date(1763641788 * 1000);
    expect(formatDate(timestamp)).toBe("2025-11-20");
})

Deno.test("formatDate from string date", () => {
    const timestamp = new Date("2025-11-20");
    expect(formatDate(timestamp)).toBe("2025-11-20");
})

Deno.test("fileExists the current file", () => {
    fileExists(import.meta.filename!).then((status) => {
        expect(status).toBe(true)
    })
})

Deno.test("fileExists file that certainly doesn't exist", () => {
    fileExists("/this/file/should/not/exist.txt").then((status) => {
        expect(status).toBe(false)
    })
})

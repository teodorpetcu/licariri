const { formatDate, fileExists }= require("../../app/utils/util.js")

test("formatDate 1st of january 1970", () => {
    expect(formatDate(new Date(0))).toBe("1970-01-01");
})

test("formatDate from timestamp date", () => {
    // multiplying by 1000 to convert to miliseconds
    let timestamp = new Date(1763641788 * 1000);
    expect(formatDate(timestamp)).toBe("2025-11-20");
})

test("formatDate from string date", () => {
    let timestamp = new Date("2025-11-20");
    expect(formatDate(timestamp)).toBe("2025-11-20");
})

test("fileExists the current file", async () => {
    fileExists(__filename).then((status) => {
        expect(status).toBe(true)
    })
})

test("fileExists file that certainly doesn't exist", async () => {
    fileExists("/this/file/should/not/exist.txt").then((status) => {
        expect(status).toBe(false)
    })
})

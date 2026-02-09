const { add } = require("@rules-javascript-test/playwright-other/example");
const { expect, test } = require("@playwright/test");

test("adds numbers", () => {
  expect(add(1, 2)).toBe(3);
});

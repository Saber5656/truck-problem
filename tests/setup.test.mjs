import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

test("the browser entry loads the React application and its stylesheet", () => {
  const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.match(html, /src="\/src\/main\.jsx"/);
  assert.match(
    readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8"),
    /import "\.\/styles\.css"/,
  );
});

test("local API credentials are excluded from Git", () => {
  const ignore = readFileSync(
    new URL("../.gitignore", import.meta.url),
    "utf8",
  );
  assert.match(ignore, /^\.env\.local$/m);
  const example = readFileSync(
    new URL("../.env.example", import.meta.url),
    "utf8",
  );
  assert.match(example, /^TYPESAFE_API_KEY=$/m);
  assert.doesNotMatch(example, /VITE_.*KEY/);
});

test("the visible people counts agree with every scenario consequence", async () => {
  const { SCENARIOS } = await import("../src/scenarios.mjs");
  assert.deepEqual(
    SCENARIOS.map(({ left, right }) => [left.people, right.people]),
    [
      [5, 1],
      [4, 1],
      [2, 1],
    ],
  );
  for (const scenario of SCENARIOS) {
    for (const option of [scenario.left, scenario.right]) {
      assert.ok(option.detail.includes(`${option.people}人`));
    }
  }
});

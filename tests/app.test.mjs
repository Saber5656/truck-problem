import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";
import { SCENARIOS } from "../src/scenarios.mjs";

test("initial screen invites Play without revealing any question or casualty group", async () => {
  // Compile the actual React screen without runtime config, credentials or a port.
  const server = await createServer({
    configFile: false,
    envFile: false,
    plugins: [react()],
    server: { middlewareMode: true, watch: null, hmr: false },
    appType: "custom",
  });
  try {
    const { App } = await server.ssrLoadModule("/src/App.jsx");
    const html = renderToStaticMarkup(createElement(App));
    assert.match(html, /トロッコ問題を遊ぶ/);
    assert.match(html, /ゲームをプレイ/);
    assert.match(html, /デモ · 架空の判定/);
    for (const scenario of SCENARIOS) {
      for (const copy of [
        scenario.title,
        scenario.description,
        scenario.left.label,
        scenario.right.label,
      ]) {
        assert.ok(
          !html.includes(copy),
          `start screen must not reveal: ${copy}`,
        );
      }
    }
    assert.ok(!html.includes('class="railway-canvas"'));
    assert.ok(!html.includes('aria-label="判定結果"'));
  } finally {
    await server.close();
  }
});

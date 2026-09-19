# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Prototype-specific decisions

- The selected visual direction is the second neon broadcast-studio concept from the 2026-09-19 ideation pass.
- The primary character is a fox-like conductor and live-show host named Jev.
- The first playable slice is a three-question, two-choice trolley-problem game with crowd and Jev probability comparisons.
- The entry is `src/main.jsx`, which mounts `src/App.jsx` and imports the stylesheet. Do not switch to a static substitute when dependency installation fails. The old `src/preview.js` is unused historical code.
- TypeSafe credentials belong only in the Git-ignored `.env.local` as `TYPESAFE_API_KEY` or in the process environment; never expose them as `VITE_` variables. The local API middleware is development-only, loopback port 5173.
- Start in demo mode, clearly label fabricated poll/demo data, and do not silently fall back to demo after an API failure. Key presence is not proof of successful authentication or credit balance.

- Canonical product checkout is `~/dev/jev-trolley-game`, separate from both Vaults. Keep the original source intact. Vault is for context and references only.
- Narrow-width judgments must come into view after confirmation, with an adjacent next-round button. New questions and replay return focus to the heading and reset scroll.
- The fixed background illustration is labeled as scenery; scenario text defines the actual dilemma.

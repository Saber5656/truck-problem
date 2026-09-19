# Prototype Instructions

## Secret files — do not read

- `.env`, `.env.local`, and all `.env.*` files are private. Agents and delegated agents must not open, read, search inside, parse, source, copy, or display their contents. This includes editor/browser snapshots, screenshots, tool results, prompts, logs, and Vault records. Do not ask the user to paste a key into chat.
- The only exception is the tracked `.env.example` template, which must contain empty credential values. Use that template to understand configuration names.
- This rule applies equally to this checkout and the original Vault copy of the project. Do not use another copy or an indirect command to read a protected file.
- The application may load its own credentials server-side through its existing runtime configuration. Agents may start/restart that runtime, but must not extract, log, or inspect the loaded values. This runtime permission does not authorize sourcing the project's env files into an agent shell.
- To check setup, use only the local `/api/status` response (`configured` boolean). File existence/permissions and Git path metadata may be checked without opening secret files. Key presence is not authentication or credit-balance verification.
- Before committing, confirm these paths are ignored and absent from the Git index using path-only checks. Never force-add them. If a secret path is already tracked, stop that commit and remove it from the index while preserving the user's local file; never inspect its content or include it in a diff. Report historical tracking without displaying any value.
- Do not put credentials in `VITE_` variables or browser source/assets. Preserve the Git exclusions. Pass these restrictions explicitly in any delegated task.

Git exclusions and these instructions do not constitute an operating-system access restriction; never claim that arbitrary tools are technically unable to read the files.

## Local preview and design

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Prototype-specific decisions

- The selected visual direction is the second neon broadcast-studio concept from the 2026-09-19 ideation pass.
- The primary character is a fox-like driver named Jev, shown in the judgment panel. The railway is seen from Jev's cockpit; never show an exterior trolley inside that first-person view (user correction 2026-09-19).
- The first playable slice is a three-question, two-route trolley-problem game. Pressing Play lets Jev choose and moves the trolley; the player watches. Do not restore player-choice inputs or an agreement score (confirmed 2026-09-19).
- The entry is `src/main.jsx`, which mounts `src/App.jsx` and imports the stylesheet. Do not switch to a static substitute when dependency installation fails. The old `src/preview.js` is unused historical code.
- TypeSafe credentials belong only in the Git-ignored `.env.local` as `TYPESAFE_API_KEY` or in the process environment; never expose them as `VITE_` variables. The local API middleware is development-only, loopback port 5173.
- Start in demo mode, clearly label fabricated poll/demo data, and do not silently fall back to demo after an API failure. Key presence is not proof of successful authentication or credit balance.

- Canonical product checkout is `~/dev/jev-trolley-game`, separate from both Vaults. Keep the original source intact. Vault is for context and references only.
- Keep trolley playback visible on narrow screens. Announce the consequence, then reveal the next connected junction and question automatically. Do not add a Next button. One explicit Play starts all three sequential decisions; disclose at most three API calls before live Play. Never auto-retry a failed request. New questions and replay return focus to the heading.
- People are placed on the forward tracks using each scenario's actual group counts. Show approach, a brief non-graphic impact transition, then the consequence. Keep the cockpit fixed while the world approaches.

- Use the same 3D rail centerline for cockpit motion and rail meshes. Animate the movable point blades after the answer and before departure. Never restore CSS background zoom/sideways translation as train movement (user correction 2026-09-19).

- Questions and choices must ask whom to HIT / SACRIFICE, using group names and ethically conflicting fictional premises. Demo and API share identical production scenario text. Choice left/right names the casualty group; travel goes to that same track. Display both sacrificed and saved groups (user correction 2026-09-20).
- The planned rails exist before departure and reconnect after each group. Add waiting-track extensions before they enter view; never show dangling track ends. After the last dilemma, travel to the terminus, stop at the platform, then allow the result screen (2026-09-19).

- After departure, never stop between questions. Reveal/request the next question after impact while cruising along a longer straight. Extend the straight if its reply is pending or failed; do not enter an undecided fork. Preserve nonzero speed at question/track boundaries and brake only at the final platform. Initial errors before departure and hidden-tab/reduced-motion accessibility behavior are distinct from intermediate stops.

# Jev Moral Railway — Design Direction

## Selected visual target

- Source: `design-reference.png` (the second generated concept selected by the user)
- Direction: the second generated concept, selected by the user on 2026-09-19.
- Surface: desktop-first browser game, responsive down to a narrow phone viewport.
- Core outcome: pressing Play asks Jev to choose a route, then visibly moves the trolley along that route. The player watches three dilemmas, without submitting a choice.

## Visual decisions

- Neon broadcast-studio atmosphere: deep navy base, cyan and signal-red action colors, restrained violet and gold accents.
- Jev is a fox-like conductor and live-show host. The character should feel playful and curious, not like an authority delivering a moral verdict.
- The primary interaction is Play above the scene. Two opposing route cards explain the consequences; they are not player-choice buttons.
- The right-side intelligence panel separates three sources of information: crowd poll, Jev probability, and Jev confidence.
- Generated raster assets are the railway stage, its empty variant, the Jev mascot, and the transparent animated trolley. UI copy, controls, probability bars, and result states stay editable and interactive.

## Interaction model

1. Start in demo mode with a visible Play button and two possible routes.
2. Press Play once: request Jev's decision (or the explicitly fictional demo value).
3. Show the selected route and move a separate trolley sprite along it. Keep next/play disabled during judgment and movement.
4. Once movement finishes, allow the next dilemma. Each of the three dilemmas requires an explicit Play action; no automatic API calls or retries.
5. Show the three Jev decisions, probabilities, and confidence, then allow replay. There is no human choice or agreement score.

Confirmed user intent on 2026-09-19: press Play and watch Jev decide and the trolley move. This supersedes the earlier player-choice/comparison flow. Keep the accepted visual direction. Use an empty version of the existing railway background plus a transparent trolley sprite; retain originals. Labels, controls and results are HTML. The stage remains a symbolic non-graphic illustration. Respect reduced motion by showing the final position without travel animation.

The default mode uses deterministic demo judgments, explicitly labeled fictional. An opt-in TypeSafe mode uses the development server adapter to call `jev-latest`; credentials never enter the browser. Key presence is not proof of authentication or credit balance.

## Implementation and responsive decisions

- React is mounted only through `src/main.jsx`. The historical `src/preview.js` is retained unused.
- Preserve the selected navy/cyan/red broadcast scene, fox conductor, left stage, large opposing choices and right comparison panel. Do not display invented live poll counts or invented Jev explanations from the concept image.
- The question is a readable neon-framed banner. Keep the question and playback controls above the scene and fit both route cards into the desktop view; keep the full mascot visible.
- Keep the mode selector next to Play, including on phones, and collapse detailed API setup guidance. Demo data is labeled fictional before playback.
- At narrow widths, keep the two route cards side by side and stack the intelligence panel below the stage. Bound each route sign to its half of the stage so long scenario labels cannot overlap.
- During playback keep the railway visible; announce progress and the decision. Place the next-round action beside the main playback control. After next/replay, focus the new heading and return to the top. Respect reduced-motion preferences.
- The railway art is a fixed stage illustration; scenario text and route signs are the source of truth for numbers and conditions.
- Screenshots and the selected source are compared in `design-qa.md`. Local demo is browser-verified; actual TypeSafe calls remain unverified; key presence alone does not establish authentication or balance. No deployment was performed.

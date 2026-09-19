# Jev Moral Railway — Design Direction

## Selected visual target

- Source: `design-reference.png` (the second generated concept selected by the user)
- Direction: the second generated concept, selected by the user on 2026-09-19.
- Surface: desktop-first browser game, responsive down to a narrow phone viewport.
- Core outcome: let a player choose between two trolley-problem actions, then compare their choice with Jev's structured decision and the crowd distribution.

## Visual decisions

- Neon broadcast-studio atmosphere: deep navy base, cyan and signal-red action colors, restrained violet and gold accents.
- Jev is a fox-like conductor and live-show host. The character should feel playful and curious, not like an authority delivering a moral verdict.
- The primary decision is always the largest interaction on screen: two opposing choice buttons at the bottom of the railway scene.
- The right-side intelligence panel separates three sources of information: crowd poll, Jev probability, and Jev confidence.
- Generated raster assets are limited to the railway stage and Jev mascot. UI copy, controls, probability bars, and result states stay editable and interactive.

## Interaction model

1. Start with a three-question run.
2. Select one of two actions.
3. Reveal the comparison with Jev.
4. Continue to the next scenario or view the final agreement count.
5. Restart from the result screen.

The default mode uses deterministic demo judgments, explicitly labeled fictional. An opt-in TypeSafe mode uses the development server adapter to call `jev-latest`; credentials never enter the browser. Key presence is not proof of authentication or credit balance.

## Implementation and responsive decisions

- React is mounted only through `src/main.jsx`. The historical `src/preview.js` is retained unused.
- Preserve the selected navy/cyan/red broadcast scene, fox conductor, left stage, large opposing choices and right comparison panel. Do not display invented live poll counts or invented Jev explanations from the concept image.
- The question is a readable neon-framed banner. Offset the existing stage image so the trolley remains visible below it; keep the full mascot visible.
- Keep the mode selector visible and collapse detailed API setup guidance to reduce panel height. Demo data is labeled fictional before a player chooses.
- At narrow widths, stack the choices and intelligence panel. Bound each route sign to its half of the stage so long scenario labels cannot overlap.
- After confirmation, focus the judgment and place the next-round action beside it. After next/replay, focus the new heading and return to the top. Respect reduced-motion preferences.
- The railway art is a fixed stage illustration; scenario text and route signs are the source of truth for numbers and conditions.
- Screenshots and the selected source are compared in `design-qa.md`. Local demo is browser-verified; actual TypeSafe calls remain unverified without a key. No deployment was performed.

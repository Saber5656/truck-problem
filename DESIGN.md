# Jev Moral Railway — Design Direction

## Selected visual target

- Source: `design-reference.png` (the second generated concept selected by the user)
- Direction: the second generated concept, selected by the user on 2026-09-19.
- Surface: desktop-first browser game, responsive down to a narrow phone viewport.
- Core outcome: pressing Play asks Jev to choose a route, then moves the driver viewpoint toward the people on that route, then shows the consequence. The player watches three dilemmas, without submitting a choice.

## Visual decisions

- Neon broadcast-studio atmosphere: deep navy base, cyan and signal-red action colors, restrained violet and gold accents.
- Jev is a fox-like driver. The character should feel playful and curious, not like an authority delivering a moral verdict.
- The primary interaction is Play above the scene. Two opposing route cards explain the consequences; they are not player-choice buttons.
- The right-side intelligence panel separates three sources of information: crowd poll, Jev probability, and Jev confidence.
- Active raster assets are the skyline, transparent cockpit overlay, transparent person piece, and Jev portrait. Rails, sleepers, points, and camera share a Three.js world. Previous stage and exterior trolley assets are kept as historical material. UI copy, controls, probability bars, and result states stay editable and interactive.

## Interaction model

1. Start in demo mode with a visible Play button and two possible routes.
2. Press Play once: request Jev's decision (or the explicitly fictional demo value).
3. Show the selected route, align the movable points, then follow the rail centerline behind the fixed cockpit. A brief dark impact transition precedes the consequence. Keep Play disabled throughout travel.
4. After impact, reveal the connected next junction; automatically present its question when the train reaches it. Each of the three dilemmas requires an explicit Play action; no automatic API calls or retries.
5. Show the three Jev decisions, probabilities, and confidence, then allow replay. There is no human choice or agreement score.

Confirmed user intent on 2026-09-19: press Play and watch Jev decide and the trolley move. This supersedes the earlier player-choice/comparison flow. Keep the accepted visual direction. Use separate forward scenery, people and fixed cockpit layers; retain original assets. Labels, controls and results are HTML. The stage remains a symbolic non-graphic illustration. Respect reduced motion by showing the final position without travel animation.

The default mode uses deterministic demo judgments, explicitly labeled fictional. An opt-in TypeSafe mode uses the development server adapter to call `jev-latest`; credentials never enter the browser. Key presence is not proof of authentication or credit balance.

## Implementation and responsive decisions

- React is mounted only through `src/main.jsx`. The historical `src/preview.js` is retained unused.
- Preserve the selected navy/cyan/red broadcast scene, fox conductor, left stage, large opposing choices and right comparison panel. Do not display invented live poll counts or invented Jev explanations from the concept image.
- The question is a readable neon-framed banner. Keep the question and playback controls above the scene and fit both route cards into the desktop view; keep the full mascot visible.
- Keep the mode selector next to Play, including on phones, and collapse detailed API setup guidance. Demo data is labeled fictional before playback.
- At narrow widths, keep the two route cards side by side and stack the intelligence panel below the stage. Bound each route sign to its half of the stage so long scenario labels cannot overlap.
- During playback keep the railway visible; announce progress and the decision. Do not show a next-round button. Automatically focus the new question after travel; replay resets to the top. Respect reduced-motion preferences.
- The landscape is symbolic, but the people sprites and labels use the actual scenario counts and conditions.
- Screenshots and the selected source are compared in `design-qa.md`. Local demo is browser-verified; actual TypeSafe calls remain unverified; key presence alone does not establish authentication or balance. No deployment was performed.


## Driver POV correction — 2026-09-19 (historical; motion superseded below)

User rejected the exterior trolley in an implied driver view. Jev is the driver. Keep the previously confirmed Play-only input: Jev answers, the route changes, the viewpoint advances toward the people on that route, and the consequence is shown. This supersedes the exterior sprite composition.

- Visual target: the same neon broadcast palette and Jev panel, with a first-person windshield view. No exterior trolley is visible. A fixed cockpit with Jev's fox hands identifies the viewpoint; the landscape and people move toward the camera.
- Scene layers: generated empty Y-branch track landscape, repeated neutral white person sprites placed ON each track, and a separate transparent cockpit overlay. Reuse no fixed-count people baked into a background.
- Scenario counts: 5/1, 4/1, 2/1. The number and consequence labels use the same scenario metadata. People are small game pieces, with no gore. A brief dark transition signifies impact, then the selected group disappears and the consequence is stated.
- Flow: ready → judging → moving → impact → arrived. Next is disabled until the impact transition completes. Reduced motion uses a still final view, no flash or shake.
- Demo/live distinction, one explicit API request per Play, and key protection remain unchanged. Existing artwork is retained as historical material.

## 2026-09-19: continuous rail geometry (supersedes image zoom)

User requests actual point blades changing after Jev answers, smooth rail-following cockpit motion, impact, then the next junction and question without a Next button. Keep the confirmed Play-only Jev participation and default demo.

Selected solution: a Three.js railway scene uses a shared arc-length sampled centerline for rails and camera. Metal movable points visibly align before departure; a fixed cockpit overlays the scene. Generated skyline/person assets preserve the selected neon broadcast art direction. After non-graphic impact, the next connected tile enters view; its question appears automatically at the next stop. Each new answer still needs explicit Play, so no background paid requests. Rejected CSS image zoom because rail geometry and camera could not agree. Three.js adds a WebGL dependency and GPU/bundle cost; cap resolution, instance sleepers, dispose resources, and report unavailable graphics before enabling Play.

Acceptance: switch completes before motion; camera stays centered and has continuous position/heading between tiles; casualties occur before next question; all three rounds and replay work at desktop and narrow widths. Reduced-motion preference skips continuous camera travel.

## 2026-09-19: continuous network, terminus, and whom to save (current)

User requests no broken rail ends, an actual station after all questions, production dilemma text in both modes, and choices naming people rather than track actions. Keep the selected cyan/red broadcast palette and fixed cockpit. Extend the existing scene: each branch diverges, contains its group, and rejoins the same trunk. Build all rail sections up front, reveal only the next group/question after impact, and connect the final trunk to a station approach. Stop at the platform; show 終点に到着 before enabling 結果を見る. No new intermediate Next buttons.

Question directions: future contribution versus headcount (scientist 1 / NEETs 5), personal loyalty versus headcount (family 1 / strangers 4), responsibility versus headcount (people who caused the accident 5 / uninvolved passerby 1). All are explicitly fictional premises; the app does not assert an ethical ranking. Use identical question objects for demo and real API. Only the source of the decision differs.

Choice contract is now left/right = group to SAVE. The physical travel route is the opposite group's track, derived by one shared helper and covered by tests. Every result names both the saved and sacrificed groups. Probability labels describe the choice of whom to save, never the probability of survival or moral correctness.

Station visual: a generated navy/brass facade with warm windows, cyan/red accents, clock, 終点 / TERMINUS signage, used as a building surface in the 3D world. Functional platform/roof/track geometry gives depth during approach. Use the established skyline and cockpit. Clear idle/loading/error, disabled Play during travel, and responsive labels remain. Source is the existing selected mock plus current cockpit screenshot; this is a scoped extension, not a new visual direction.

## 2026-09-20: choose the casualty and keep rolling (current)

User correction supersedes the previous rescue-choice and per-round Play design. Keep the selected cockpit and neon layout. Each left/right choice now names the group to hit; the same-side track is selected and the opposite group survives. One Play starts all three decisions. Show the next question after impact while continuing along the rejoining track and a longer straight. Never brake at question boundaries. Only the terminal station decelerates to zero.

Separate question state from physical train position. Use one distance/speed simulation for the complete run: initial acceleration, constant cruise across round boundaries, final station braking. Pending/failed replies extend the straight before the next junction; the train keeps moving and no unchosen route is entered. API errors remain explicit with manual retry, never fabricated decisions or automatic resends. Initial demo remains free of API calls; live Play clearly authorizes up to three sequential decisions, one per question. First-round errors occur before departure. No new assets or visual direction are needed.

Verification: direct casualty mapping, single-start automatic sequence, positive speed at question boundaries and during delayed/error responses, smooth connected track extensions, continuous station-entry velocity, final zero speed, visible console/error/retry states, full desktop and narrow browser run.

## 2026-09-20: shorter journey and minimal production interface (current)

User requests the original junction spacing plus a small allowance, the production screen with demo decisions until API connection, and only essential functions. Product Design get-context / image-to-code scoped iteration: retain the selected neon reference, actual cockpit, rail scene and Jev portrait; no new visual direction or assets. Remove fictional audience polls, slogans, developer credential instructions, duplicate progress and repeated explanations. Keep the question and its ethical premise, two named groups, one Play control, Jev's choice / probabilities / confidence, terminal results and replay. A compact header badge explicitly labels fabricated demo judgments; its disclosure contains the optional mode selector. Live opt-in still discloses up to three requests before Play. Both modes use identical layout and scenario text.

Spacing: 120 metres per ordinary junction (original 96 + 24, replacing 256); final junction remains 96. Extend by 40 metres only when the next points are still unlocked near the end. Bound visible fog before undecided future geometry so an exceptional extension cannot move a visible fork. Cruise continuously and brake only at the station. Verify fast replies do not extend, delayed/error replies remain safe, and responsive UI stays uncluttered.

## 2026-09-20: title screen and correct person occlusion (current)

User supplies screenshots of the ready screen leaking question 1 and rails rendering across people. Apply Product Design scoped image-to-code changes to those exact surfaces, retaining the chosen neon palette and cockpit. Before Play, show a dedicated title panel: Jev portrait, "トロッコ問題を遊ぶ", a single short introduction and Play. Reuse existing skyline and portrait; no question, group labels, people, judgment panel or question counter until Play. Keep the compact demo/mode control and explicit API cost notice. Start mounts the railway, waits for scene readiness, then automatically judges question 1. Replay returns to the title. On narrow screens, stack portrait and title/button; no extra explanatory widgets.

Rendering correction: the transparent person sprite must write depth for its alpha-tested visible pixels. This lets the nearer person occlude farther portions of long transparent rail meshes even when their object-level sort order differs. Keep depth testing, alpha cutout, distance fade and physical placement; do not draw people indiscriminately over near geometry. Verify at the five-person approach shown by the user and on the branch route.


## 2026-09-20: five people on the default straight, faster playback (current)

User correction: every left/default straight has five people, every right/diverted rail has one. Swap the first two groups and make strangers five in question 2. Labels remain group names; the scenario/API instructions explicitly describe inaction versus intentionally moving the lever. Points start fully aligned straight; choosing left leaves them still, only right animates them. Preserve the existing cockpit/neon layout and assets; this is scenario/animation tuning, not a redesign.

Increase cruise speed from 10 to 18 m/s. Keep connected geometry, continuous inter-question motion and station braking. Shorten the consequence hold to 0.6s and point movement/settling to 0.7/0.8s, keeping impact at 0.55s. The normal 120m tile stays short; only a delayed/failed response may add waiting track. Test sub-27s running time with a simulated 0.8s response and no extension, plus delayed-response protection. Share timing constants between actual scene and simulation tests.

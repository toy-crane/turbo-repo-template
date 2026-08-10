---
name: create-app-assets
description: Create or replace a mobile app's approved app icon system and splash artwork with imagegen, then apply and verify Apple Icon Composer, Android adaptive, monochrome, legacy, and Expo splash assets. Use when the user asks to make, redesign, or update an app icon, launcher icon, adaptive icon, themed icon, or splash image in this project. Keep concept previews out of active asset paths until the user explicitly approves a final design. Do not use for in-app interface symbols, store screenshots, Play feature graphics, or general marketing art.
---

# Create App Assets

Create one shared visual mark, then adapt it to each platform after two user
choices: concept selection and final approval.

## Ground the request

Read these project decisions before generating anything:

- `docs/decisions/mobile-app-asset-generation.md`
- `docs/decisions/template-project-identity.md`
- `docs/decisions/mobile-testing-and-verification.md`

Inspect the effective Expo config, current asset paths, Git status, and existing
brand files. Do not treat a generated native directory as the source of truth.

Require all of the following before making a preview:

1. `bun run setup` has replaced every identifier it owns with one coherent
   project identity. Treat `scripts/setup/identity.ts` and its `IDENTITY_FIELDS`
   plus `isConfigured` check as the source of truth. Inspect the root package
   name, Expo name, slug and scheme, both mobile app identifiers, and Supabase
   `project_id`; do not infer completion from the mobile config or the user's
   claim alone.
2. The user has explicitly asked to create or change app assets.
3. The app has a one-sentence description naming its audience and main job.

If setup is incomplete, stop and tell the user to run it. Do not run setup on
their behalf. If only the app description is missing, ask exactly one question
for it. Accept existing logos, colors, reference images, forbidden symbols, and
visual dislikes as optional constraints; their absence must not block work.

Do not install SnapAI, select another image provider, or request an external
provider key. Use the current harness's installed bridge to Codex's built-in
image generation: `imagegen` in Codex, or `image-gen` in Claude. Read that Skill
before generating or editing any image and follow its image-input rules. If the
current harness exposes neither bridge, stop and report the missing capability;
do not invent a CLI or API fallback.

## Protect active assets

Record the current config and active asset paths before work. Preserve unrelated
dirty files. Create previews and intermediate layers in a temporary directory
outside the repository or another ignored location.

Before final approval, do not change:

- `apps/mobile/assets` active files
- `apps/mobile/app.json` or `apps/mobile/app.config.ts`
- asset configuration tests
- native project files

Do not stage or commit rejected concepts or temporary previews.

## Create three concept previews

Turn the app description and constraints into exactly three materially different
directions. Vary the symbol or composition, not merely the color. For each
direction, state:

- a short name and one-sentence idea
- primary symbol and background treatment
- palette and mood
- the feature that must survive at small sizes
- avoided elements

Use the installed image-generation bridge to make one separate square preview
per direction. Never combine the directions into a collage. Keep device frames,
app UI, store badges, text, and rounded-corner masks out of the artwork unless
the approved brand itself requires lettering.

Create a deterministic 60×60 thumbnail from every preview and inspect it. Reject
or regenerate a direction when its main symbol is no longer recognizable or
cannot be named in three words. Show the three previews and their notes together,
then ask the user to select one direction or reject all three. Wait for the
answer.

## Refine one selected direction

Treat concept selection as permission to refine only that direction, not as
final approval or permission to edit project assets.

Use the selected preview as the image-editing reference. Change one requested
property at a time while holding every confirmed property fixed. Show each
revision, recheck it at 60×60, and wait. Keep rejected directions discarded.

When the selected direction is ready, create its candidate source layers in the
temporary workspace before asking for final approval:

- a full-bleed background
- a transparent foreground mark
- an extra transparent semantic layer only when the approved depth requires it
- a one-color silhouette candidate for Android monochrome treatment

Use image editing with the selected preview as reference when generated detail
must be separated. Redraw simple geometry as SVG instead. Recompose the source
layers and compare that composite with the selected preview at full size and
60×60. If separation changes the design materially, show the difference and
refine the layers before continuing. When clean separation would visibly damage
a photographic or highly textured design, prepare a flat Apple fallback now,
explain the reduced Liquid Glass depth, and show that fallback alongside the
other platform layers. Never choose or substitute this fallback after final
approval. Show the recomposed candidate and layer sheet to the user; do not ask
them to approve source files they have not seen.

Ask for final approval only when the user indicates that this layered candidate
is ready. Make clear that final approval covers the shown source layers and
authorizes replacing the active app icon and splash assets and updating their
Expo configuration, but no other product code.

## Build the approved asset set

After explicit final approval, read
[`references/platform-assets.md`](./references/platform-assets.md) completely.
Follow its output paths, platform roles, source preservation, isolated build
check, and visual verification requirements.

Build every final file from the approved source layers shown before approval.
Generate size variants deterministically from those sources; never ask the
image-generation bridge to redraw each size.
Redraw a simple geometric mark as SVG when generated bitmap edges do not remain
crisp. Do not silently flatten an Apple icon whose approved design can remain
layered.

Assemble and build-check the candidate in a disposable copy before replacing
active assets. If Icon Composer, Expo prebuild, or Apple asset compilation fails,
fix only the candidate and leave the current active files unchanged.

Once the isolated build check passes, copy only the approved asset set into the
active paths, update Expo config, and add or update a config test that verifies
the configured roles and the existence of every referenced file.

## Verify and hand off

Run static checks first, then native build checks, then visual checks from
`references/platform-assets.md`. Invoke the project `agent-device` skill for
Simulator or Emulator work and follow its current installed CLI help.

Report direct observations separately from unverified platform combinations.
Do not claim completion while any required compiler, config, iOS appearance,
Android mask or themed-icon, or splash check remains unavailable. Preserve the
exact failing command and the active/candidate asset state when blocked.

Follow the repository's normal commit policy after all available checks pass.
Never add store screenshots, Play feature graphics, alternate app icons, an
image-generation CI pipeline, or unrelated UI icons as part of this workflow.

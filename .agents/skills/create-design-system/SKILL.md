---
name: create-design-system
description: Turn a visual brief, with an optional reference image or URL, into an approved design system for Expo apps that use HeroUI Native and Uniwind. Use when the user wants to create, explore, compare, refine, export, or apply design tokens or a visual theme from a reference, brand, mood, or style. Generate a standalone HTML review artifact and change the canonical theme only after explicit approval. Do not use for web themes, app icons, one-off component styling, or a new component library.
---

# Create Design System

Create a design system the current mobile project can use, show the result in a
standalone HTML file, and require visual approval before changing the app.

## Ground the work

1. Invoke `project-knowledge`. Read `GLOSSARY.md`, the decision index, and
   only the decisions relevant to colors, typography, UI ownership, icons, and
   runtime verification.
2. Inspect the installed Expo, HeroUI Native, Uniwind, and React Native
   versions; `global.css`; theme bridges; Metro configuration; and raw colors
   that bypass semantic roles.
3. Invoke `heroui-native` and `uniwind` for the installed theming APIs.
   Fetch the current official HeroUI Native theming and color documentation.
   Do not assume a variable or API exists because it appeared in an older
   project.
4. Find the exact semantic variable set and canonical theme source. Preserve
   the project's names, meanings, and chosen color format.
5. Read [platform constraints](./references/platform-constraints.md) completely
   before generating a candidate. Apply those constraints internally; do not
   put them in the review HTML.

## Require a useful visual brief

Prefer these two inputs together:

1. one reference image or URL;
2. one sentence naming the qualities to carry over.

Treat a supplied image as a style reference, not an edit target. Inspect it, but
do not invoke image generation and do not copy its logo, photos, copy,
navigation, or product structure.

When the user gives only text, offer two or three distinct, project-compatible
directions with a short name and one sentence each. Wait for a direction before
building the HTML. When the reference and brief already identify one clear
direction, create one candidate. Create up to three candidates when the user
asks to compare directions.

Resolve missing project facts yourself. Ask only questions whose answers would
materially change the visual direction.

## Generate candidates

- Use the complete current HeroUI Native semantic variable set. Define the same
  keys for Light and Dark.
- Keep every semantic role stable. Never use a warning color as decoration or
  turn a neutral role into a second brand role.
- Keep background and foreground partners together, including surface, accent,
  status, field, overlay, and segment pairs.
- Generate the visual system as related choices: color temperature, chroma,
  contrast, content radius, field radius, border widths, surface and overlay
  shadows, spacing density, and semantic text emphasis.
- Keep the system font and semantic text roles. Do not add a font selector or
  bundle a font to express the reference.
- Keep candidate count, labels, and differences tied to the user's request.
  Do not always create three.
- Hold copy, data, layout, components, and states constant between candidates.
- If an existing role cannot express a required product meaning, propose the
  exact new role and wait for approval before adding it.

Candidate work stays outside the canonical theme. Do not edit `global.css`,
app routes, Metro theme registration, or product components before approval.

## Produce the HTML review

Read [the preview contract](./references/preview-contract.md) completely. Copy
[the preview template](./assets/preview.html) to a temporary directory outside
the repository or an ignored path. Replace the marked `PREVIEW_DATA` block,
then run `node scripts/validate-preview.mjs <preview.html>` from this skill
directory.

The primary review result is `preview.html`.

- Do not invoke `build-prototype`, copy its shell, or add its screen, state, or
  viewport controls.
- Do not add a preview route, theme switcher, or candidate CSS to the app.

Serve or open the HTML with the available browser tooling. Verify candidate
switching, every tab, the Export drawer, interactive controls, responsive
layout, and browser console errors before sharing the live page or file.

## Refine without applying

- Accept natural-language changes such as `less yellow`, `sharper corners`,
  or `more compact`.
- Refine only the selected candidate and keep unrelated properties fixed.
- Regenerate the same HTML and recheck all review interactions.
- Treat selecting a candidate as direction feedback, not permission to change
  production files.
- Require an explicit statement that the shown design system should be applied.

## Apply an approved system

1. Update the canonical HeroUI Native and Uniwind theme source with the approved
   Light and Dark values.
2. Update only established one-way bridges for consumers that cannot read the
   CSS values directly.
3. Leave components that already use semantic roles unchanged. Fix only raw
   values or disconnected props that block the approved system.
4. Keep repeated exceptions in one existing shared adapter instead of copying
   values into screens.
5. Do not combine layout, navigation, copy, component, or product behavior
   changes with the design-system application.
6. Remove candidate files, temporary HTML, preview routes, switchers, and
   temporary theme registration. Preserve only the approved canonical values.

## Verify and close

- Check equal variable coverage in Light and Dark and verify foreground pairs.
- Check contrast for text, actions, fields, focus, disabled, success, warning,
  and danger states.
- Run repository checks, type checks, and relevant tests.
- Verify actual iOS and Android screens in Light and Dark, including text
  scaling, high contrast when available, and reduced motion.
- Sample important routes outside the review HTML for global regressions.
- Report the approved direction, changed tokens and bridges, exceptions,
  runtime evidence, remaining risks, and confirmation that review scaffolding
  was removed.

# HTML preview contract

Use the preview to answer one question: does this finished design system fit the
current project?

## Keep the artifact independent

- Copy `assets/preview.html` into a temporary directory or ignored path.
- Keep the output as one self-contained `preview.html`.
- Use plain HTML, CSS, and JavaScript with no build step or network dependency.
- Do not reuse `build-prototype/templates/shell.html` or its review chrome.
- Do not create an app route, register temporary Uniwind themes, or change
  `global.css` to render candidates.
- Do not create a PNG as the review deliverable.

The bundled template marks one editable region: `PREVIEW_DATA`. Put candidate
names, preview-only presentation values, palettes, and the complete export token
sets there. The template builds the switcher and exported CSS from that data.

Keep the rest of the template stable unless the user is explicitly reviewing
the template itself.

## Show results only

Never place these items inside the HTML:

- the source image or URL;
- extracted or rejected characteristics;
- explanations or rationale;
- platform UI or renderer ownership;
- implementation instructions;
- approval guidance.

The conversation may identify the candidates by name and ask what to change.
The page itself shows only the finished candidates.

## Keep one universal structure

The header contains the current candidate name, candidate selector, and
`Export`. Hide the selector when there is only one candidate.

Use exactly these tabs:

1. `Overview`
2. `Components`
3. `Patterns`

### Overview

Show a representative headline, palette, semantic type roles, actions, search,
chips, a card, a list, status feedback, and Light and Dark surface samples.
This is a visual specimen, not a token table.

### Components

Show primary, secondary and disabled actions; fields and focus; chips; on and
off selection; success, warning, and danger feedback.

### Patterns

Show generic search and filter, content list, and form and action combinations.
Do not hard-code Home, Settings, a dashboard, mail, chat, finance, or another
product screen.

### Export

Show the complete candidate CSS in a drawer. Include the same semantic variable
set for Light and Dark plus radius, field radius, border widths, shadows, and
any basic palette primitives used by the candidate.

## Hold comparisons constant

- Use identical copy, data, layout, components, states, and tab structure for
  every candidate.
- Change only design-system values. Candidate names and selector labels may
  differ, but specimen copy and marks stay identical.
- Keep candidate names descriptive and neutral. Do not use A, B, or C when a
  meaningful two- or three-word name is available.
- Make the reference style recognizable through the combined system, not
  through a copied logo or illustration.

## Verify before review

- Open the file in a browser.
- Switch through every candidate and confirm the URL hash follows it.
- Open every tab.
- Open and close Export and confirm its CSS matches the selected candidate.
- Exercise buttons, fields, chips, and toggles.
- Check narrow and wide layouts for horizontal overflow.
- Check the browser console for errors.
- Run `node scripts/validate-preview.mjs <preview.html>` from the skill
  directory.

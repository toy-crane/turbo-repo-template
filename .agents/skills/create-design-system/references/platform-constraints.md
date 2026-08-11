# Internal platform constraints

Use these constraints while generating candidates. Do not show this analysis or
its rejected alternatives inside the HTML preview.

## Preserve one theme source

- Treat the HeroUI Native variables in the project's `global.css` as the
  canonical React Native UI theme source.
- Preserve existing semantic names and meanings. Keep Light and Dark variable
  sets equal.
- Keep a basic palette inside `global.css` only as an implementation detail.
  Components consume semantic roles rather than raw palette names or hex values.
- Treat navigation or hosted-native bridges as consumers of the canonical
  source, never as another palette.

## Preserve UI ownership

- Leave Native Stack headers, tabs, toolbars, sheets, transitions, gestures,
  and system materials under their current owners.
- Leave hosted SwiftUI and Compose control internals under their platform
  owners. Pass an accent or seed only through a supported API when the project
  already requires that connection.
- Apply content radius, borders, shadows, and density only where the existing
  React Native UI or HeroUI Native design system owns them.
- Do not force a content radius, border, shadow, font, or pressed state onto
  platform-owned controls.

## Preserve typography and accessibility

- Keep each platform's system font and the project's semantic text roles.
- Preserve Dynamic Type, Android font scaling, high contrast, reduced motion,
  control states, and accessibility roles.
- Judge consistency by meaning, hierarchy, emphasis, and behavior rather than
  pixel identity across iOS, Android, and HTML.

## Adapt incompatible references

A reference may derive its identity from thick control borders, unusual field
shapes, strong shadows, or nonstandard system controls. Keep compatible parts
such as palette, contrast, content geometry, spacing, density, and hierarchy.
Reduce or redirect incompatible parts into design-system-owned content.

Do not explain these reductions in the review page. The user reviews whether
the resulting system fits the repository, not why individual reference details
were excluded.

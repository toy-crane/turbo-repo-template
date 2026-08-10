# Platform asset contract

Read this file only after the user explicitly approves the final concept.

## Preserve the source

Keep reproducible source material under
`apps/mobile/assets/app-icon-source/`:

- `prompt.md`: app description, selected concept, final generation and editing
  prompts, negative constraints, and final palette
- numbered source layers ordered back to front, preferably SVG for geometric
  artwork and PNG for raster artwork
- sanitized copies of every user-supplied logo or reference image that the
  approved design still depends on; omit references that did not affect the
  final design
- a short manifest mapping each source layer to the Apple, Android, legacy, and
  splash outputs and naming every preserved reference used to create them

Do not preserve rejected previews. Remove image metadata that can reveal local
paths or unrelated prompt history.

## Write the active outputs

The table lists defaults for roles that do not already have an established
configured path:

| Role | Repository output | Expo config value |
| --- | --- | --- |
| Cross-platform and Android legacy icon | `apps/mobile/assets/icon.png` | `./assets/icon.png` |
| Apple Icon Composer document | `apps/mobile/assets/AppIcon.icon` | `./assets/AppIcon.icon` |
| Android adaptive foreground | `apps/mobile/assets/android-icon-foreground.png` | `./assets/android-icon-foreground.png` |
| Android adaptive background | `apps/mobile/assets/android-icon-background.png` | `./assets/android-icon-background.png` |
| Android themed icon | `apps/mobile/assets/android-icon-monochrome.png` | `./assets/android-icon-monochrome.png` |
| Splash symbol | `apps/mobile/assets/splash-icon.png` | `./assets/splash-icon.png` |

Resolve every path that can supply one of these roles from the inspected
effective config before writing files. Preserve an established compatible path
and write its replacement there; use the table default only when that role is
not configured. Apply these override rules explicitly:

- Keep `expo.icon` pointed at an approved flattened legacy icon. If it is
  missing, add it with the table's Expo config value.
- `expo.ios.icon` must be a string path ending in `.icon`. Preserve it only when
  it already has that shape. Migrate a PNG string, a `{ light, dark, tinted }`
  object, or a missing value to the approved `./assets/AppIcon.icon` config
  value; those forms cannot activate an Icon Composer document.
- When `expo.android.icon` exists, either replace the file at that path with the
  approved flattened legacy icon or remove the override so the updated
  `expo.icon` becomes effective. Never leave it pointing at the old artwork.
- Preserve and replace each configured Android adaptive foreground, background,
  and monochrome path independently.
- Enumerate every image-valued override in the `expo-splash-screen` plugin,
  including root and platform-specific light, dark, density, tablet, and
  drawable variants. Replace each configured path with the approved splash
  symbol at the required deterministic size, or remove a redundant override
  only after the isolated prebuild proves that the updated root image supplies
  that appearance. Never leave a dark or platform-specific path pointing at old
  artwork.

Keep all resulting config fields relative to the Expo app root, not the
repository root. Do not move
an established compatible asset merely to match the table. Keep the existing
light and dark splash background colors. They are build-time snapshots of the
app's canonical background tokens and are outside this Skill's approval scope.
Handle any requested color change as a separate theme change before running
this Skill again.

## Build the Apple icon

Prepare artwork on a 1024×1024 canvas. Prefer SVG and use clearly defined edges.
Export foreground art without a canvas mask, background color, blur, shadow,
specular highlight, or glass effect. Apply those effects in Icon Composer.

Create `AppIcon.icon` with Apple's Icon Composer rather than hand-authoring its
package format. Use a Composer background and one transparent foreground group
by default. Add a third group only when it preserves an approved semantic layer
or necessary depth. Configure iOS Default, Dark, and Mono appearances and inspect
both clear and tinted Mono previews.

If the current harness cannot operate Icon Composer, prepare the approved source
layers and request the single editor/export action from the user. Keep this as a
completion blocker and do not replace active assets. Do not invent an undocumented
`.icon` package structure.

The approved source contract must already say whether Apple receives layered
artwork or a flat fallback. Do not switch to a flat icon here. If the approved
layers cannot build without a material visual change, return to the layer review
and approval step while the active assets remain untouched.

Current authoritative references:

- [Apple: Creating your app icon using Icon Composer](https://developer.apple.com/documentation/Xcode/creating-your-app-icon-using-icon-composer)
- [Apple Human Interface Guidelines: App icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Expo: Splash screen and app icon](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/)

## Build the Android icon

Use three independent roles:

- Foreground: transparent color artwork with the main mark inside the safe zone.
- Background: full-bleed opaque color or artwork without the foreground mark.
- Monochrome: one solid silhouette whose alpha defines the mark that Android
  tints. Do not reuse a flattened color icon.

Design all adaptive layers on the same 108-unit grid. Keep the essential mark
between 48×48 and 66×66 units, inside the central safe zone, and leave the outer
18 units on every side available for masking and launcher motion. Export matching
square PNG dimensions. Check clean edges without baked-in mask shapes or
background shadows.

Compose `icon.png` from the approved foreground and background for older Android
launchers. Keep it square, full-bleed, and free of a pre-rounded mask.

Current authoritative references:

- [Android Developers: Adaptive icons](https://developer.android.com/develop/ui/compose/system/icon_design_adaptive)
- [Expo app config: Android adaptive icon](https://docs.expo.dev/versions/latest/config/app/#adaptiveicon)

## Build the splash symbol

Reuse the approved mark, not the entire masked launcher icon. Keep transparency
around the symbol and enough padding for different screen sizes. Keep the
existing `expo-splash-screen` light and dark background colors unchanged.

Test the splash in a production-style native build. Expo Go and development
clients can show their own splash behavior and are not valid visual evidence for
the final launch screen.

## Verify before activating

Work in a disposable copy or temporary worktree that contains the current
project plus the candidate assets and config.

Provision that isolated workspace before invoking Expo. Run
`bun install --frozen-lockfile` there, or reuse the current checkout's installed
dependencies only when the link or copy resolves the same lockfile. Use the
installed Expo CLI without allowing `bunx` to fetch a different version.

Also make the current checkout's validated mobile environment available to the
isolated commands. Either copy the ignored `apps/mobile/.env.local` into the
same ignored path for the life of the disposable workspace or export its five
validated `EXPO_PUBLIC_*` values for each command. Never invent, print, commit,
or preserve these values with the icon sources. If the current checkout cannot
resolve its Expo config, keep activation blocked until the user supplies the
normal local mobile environment.

1. Resolve the Expo config and assert that every configured asset path exists.
   Confirm that `ios.icon` resolves to the candidate `.icon`, that an
   `android.icon` override cannot hide the candidate legacy icon, and that no
   splash image override still resolves to old artwork.
2. Confirm the Android foreground, background, and monochrome roles do not point
   to one flattened file.
3. Run both Expo iOS and Android prebuilds with the provisioned local Expo CLI
   and prebuild's dependency-install step disabled.
4. Confirm the iOS prebuild copies `AppIcon.icon` and sets the app icon compiler
   name. Confirm the Android prebuild processes the three candidate layers and
   writes the adaptive, monochrome, and legacy launcher resources without an
   image-processing error.
5. Compile the `.icon` with the installed Xcode asset compiler. Derive the
   platform and minimum deployment target from the generated project rather
   than copying a stale literal. Require generated phone and tablet icon output
   plus `Assets.car`.
6. Use the Icon Composer UI or locate Icon Composer's bundled exporter relative
   to the active Xcode developer directory:

   ```bash
   composer_tool="$(xcode-select -p)/../Applications/Icon Composer.app/Contents/Executables/ictool"
   "$composer_tool" --help
   ```

   Follow that bundled binary's current help to export and inspect Default,
   Dark, Mono clear, and Mono tinted output at full and 60×60 sizes. Do not use
   `xcrun ictool --help`; Xcode's separate asset-catalog `ictool` does not expose
   this export interface. If neither the UI nor the bundled exporter is
   available, keep activation blocked and request the single Composer action
   from the user.

Only after these checks pass, replace the active files and config. Add or update
the project's config test so it checks the top-level `expo.icon`, the effective
Android legacy icon path, `ios.icon`, all three Android adaptive roles, every
configured splash image variant, and the existence of every referenced file.
Also assert that `ios.icon` is a `.icon` path and that no supported appearance
or platform override resolves to superseded artwork.

## Verify the active app

Run the repository gates from the root:

```bash
bun run check
bun run check-types
bun run test
```

Then verify native output:

- iOS 26 Simulator: Home Screen icon in Default, Dark, and tinted appearances.
- Android Emulator: circle, rounded-square, and squircle masks plus a themed
  icon with system tinting enabled.
- iOS and Android: light and dark splash backgrounds, centered symbol, and no
  clipping.

Use a native production-style build for splash evidence. Record older iOS
appearance as unverified when no older Simulator runtime is installed. Treat a
generated preview or successful state change as mechanical evidence, not user
approval of the visual result.

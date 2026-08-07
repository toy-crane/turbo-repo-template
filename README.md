# Turbo Repo Template

Bun, Turborepo, and Ultracite starter workspace. Add applications under
`apps/` and shared packages under `packages/` as needed.

## Commands

```bash
bun run dev
bun run build
bun run check
bun run fix
bun run check-types
bun run test
```

## Mobile development

The Expo SDK 57 app lives in `apps/mobile` and uses an app-specific Development
Build for iOS and Android.

```bash
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile android
bun run --cwd apps/mobile start
bun run --cwd apps/mobile test:watch
```

Check the local device automation toolchain and run its pinned CLI from the
repository root:

```bash
bun run agent-device:doctor
bun run agent-device -- --version
```

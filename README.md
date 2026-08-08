# Turbo Repo Template

A starter workspace built from Bun, Turborepo, Ultracite, Expo, and Supabase.
Add applications under `apps/` and shared packages under `packages/`.

## First run: set the project identity

```bash
bun install
```

```bash
bun run setup
```

`bun run setup` asks for a project slug, a display name, and a mobile app
identifier one step at a time, shows every field it would change with both the
old and new value, and applies them only after you confirm. The wizard prompts
in Korean.

| Input | Applied to |
| --- | --- |
| Project slug (lowercase kebab-case, must start with a letter) | `name` in the root `package.json`, Expo `slug` and `scheme`, `project_id` in `supabase/config.toml` |
| Display name | Expo `name` |
| Mobile app identifier (complete reverse-DNS) | iOS `bundleIdentifier`, Android `package` |

To run it without prompts, pass all three values:

```bash
bun run setup --project-slug aurora-notes --display-name "Aurora Notes" --mobile-app-id com.aurora.notes --yes
```

One identifier serves both platforms, so it must satisfy the rules of each:
no hyphens or underscores, and no Java or Kotlin reserved words. A slug becomes
the Expo `scheme`, so it cannot start with a digit.

Once every identifier has been changed, setup shows the current values and exits
without touching anything; pass `--force` to apply again. Setup edits only the
fields in the table above and never replaces strings across the repository. It
does not start, stop, or reset the local Supabase stack, and it neither reads nor
writes env files. The local PostgreSQL database keeps its real name, `postgres`.

## Everyday commands

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
Build on both iOS and Android.

```bash
bun run --cwd apps/mobile ios
bun run --cwd apps/mobile android
bun run --cwd apps/mobile start
bun run --cwd apps/mobile test:watch
```

Run the local device automation toolchain through the CLI pinned in the
repository:

```bash
bun run agent-device:doctor
```

## Supabase local stack

Docker must be running.

```bash
bun run db:start
bun run db:status
bun run db:stop
bun run db:reset
```

`bun run db:start` prints the connection details, including the API URL and the
publishable key. `bun run db:status` shows the same information again.

## Changing the Supabase schema

The `.sql` files in `supabase/schemas/` are the source of truth for the database
structure. Never hand-write a migration first.

1. Edit the schema files in `supabase/schemas/` to describe the desired final
   state.
2. Generate the migration. The result lands in
   `supabase/migrations/<timestamp>_<name>.sql`.

   ```bash
   bun run db:diff -- -f <descriptive-name>
   ```

3. **Treat the generated migration as a draft and have the reviewer read it**
   (see below). Check for destructive changes, grants and RLS, view and function
   security, objects the diff missed, and lock and ordering behavior.
4. Replay the whole migration history from scratch to verify it.

   ```bash
   bun run db:reset
   ```

5. Regenerate the shared types from the same local schema. The result is
   `packages/supabase/src/database.types.ts`.

   ```bash
   bun run db:types
   ```

6. Commit the schema, the migration, the generated types, and any related
   database tests as one logical change.

Never edit a migration that has already been deployed — add a forward migration
instead. Do not put arbitrary `BEGIN` or `COMMIT` statements inside a normal
migration. Ordinary CI does not create the local Supabase stack, so the evidence
that the full history replays comes from whoever changed the schema.

### Migration reviewer

The reviewer is read-only: it changes neither files nor any database. Checks it
could not run — a fresh replay, database tests, production-size lock behavior —
are reported as `UNVERIFIED` rather than as success.

| Tool | Where to invoke it |
| --- | --- |
| Claude Code | the `supabase-reviewer` subagent — [.claude/agents/supabase-reviewer.md](.claude/agents/supabase-reviewer.md) |
| Codex | [.codex/agents/supabase-reviewer.toml](.codex/agents/supabase-reviewer.toml) |
| Shared skill | [.agents/skills/supabase-reviewer/SKILL.md](.agents/skills/supabase-reviewer/SKILL.md) (Claude reads it through the `.claude/skills/supabase-reviewer` symlink) |

### Schema file order

`schema_paths` in `supabase/config.toml` reads `./schemas/*.sql`, and Supabase
runs the files in lexicographic order. The files use two-digit prefixes so that
order is readable from the names alone. See
[supabase/schemas/README.md](supabase/schemas/README.md).

## Shared database types

`packages/supabase` is a types-only package named `@repo/supabase`. The mobile
app and any future server use the same `Database` type from it. Runtime
dependencies, environment variable access, and a finished client do not belong
in this package.

`bun run db:types` generates `packages/supabase/src/database.types.ts`, so never
edit it by hand. `packages/supabase/biome.jsonc` excludes just that file from
lint, which keeps it identical to the generator output. If generation fails, the
existing file is left untouched.

## Connecting to Supabase

You supply the Supabase URL and publishable key yourself.

1. Run `bun run setup` to set the project identifiers.
2. Start the local stack with `bun run db:start`.
3. Take the **API URL and the publishable key only** from that output, or from
   `bun run db:status`.
4. Create `apps/mobile/.env.local` using
   [apps/mobile/.env.example](apps/mobile/.env.example) as the reference.

   ```dotenv
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

5. Run the mobile Development Build.

   ```bash
   bun run --cwd apps/mobile ios
   ```

When you point the app at a hosted Supabase project, put that project's URL and
publishable key into the same two variables. `bun run setup`, `bun run db:start`,
and the mobile run commands never create or overwrite an env file, and never
switch between local and remote values for you.

Both variables are required to build or start the app: `apps/mobile/app.config.ts`
checks them while Expo resolves the app config, so `expo start`, `expo prebuild`,
`expo run:*`, and `expo export` all fail with the missing variable names instead
of producing a bundle that breaks at launch. The app also checks at runtime and
shows the same message on screen, which covers bundles delivered over the air.

> **Warning**: `EXPO_PUBLIC_` values are embedded verbatim in the app bundle and
> are therefore public. Never put a `service_role` key or any secret key in these
> variables. `.env.local` is excluded from Git; the repository carries only an
> example file listing the variable names.

### Troubleshooting

- **The build or the app reports a missing variable**: fill in `.env.local` and
  restart the bundler. The message names the variables that are missing.
- **The app cannot reach the local API**: `http://127.0.0.1:54321` only works as
  written on the iOS Simulator. An Android emulator reaches the host loopback at
  `10.0.2.2`, and a physical device needs your development machine's LAN IP. Find
  the address that is actually reachable from the device you use and put it in
  `EXPO_PUBLIC_SUPABASE_URL`. The template does not automate a tunnel or rewrite
  the host for you.
- **After adding a native module**: a dependency with native code, such as
  `expo-sqlite`, cannot run on an existing Development Build. Rebuild it with the
  `ios` or `android` command.

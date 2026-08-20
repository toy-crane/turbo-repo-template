import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const rootPackageJson = `{
  "name": "turbo-repo-template",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "setup": "bun scripts/setup/cli.ts"
  }
}
`;

const mobileAppJson = `{
  "expo": {
    "name": "Turbo Repo Mobile",
    "slug": "turbo-repo-mobile",
    "version": "1.0.0",
    "scheme": "turbo-repo-mobile",
    "ios": {
      "bundleIdentifier": "com.toycrane.turborepotemplate.mobile",
      "supportsTablet": true
    },
    "android": {
      "package": "com.toycrane.turborepotemplate.mobile",
      "predictiveBackGestureEnabled": false
    }
  }
}
`;

const supabaseConfigToml = `# For detailed configuration reference documentation, visit:
# https://supabase.com/docs/guides/local-development/cli/config
project_id = "turbo-repo-template"

[api]
enabled = true
port = 54321

[db]
port = 54322

[auth.external.google]
enabled = false
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_IDS)"
secret = "env(SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET)"
skip_nonce_check = false

[auth.external.apple]
enabled = false
# A comment between the header and the key, as the real file has.
client_id = ""
secret = "env(SUPABASE_AUTH_EXTERNAL_APPLE_SECRET)"
# Two more empty strings under the same table. Only client_id may move.
redirect_uri = ""
url = ""

[auth.external.azure]
enabled = false
client_id = ""
`;

/**
 * Write a throwaway copy of the template's identity files so setup tests never
 * touch the working repository.
 */
export function createTemplateFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "turbo-repo-setup-"));

  mkdirSync(join(root, "apps", "mobile"), { recursive: true });
  mkdirSync(join(root, "supabase"), { recursive: true });
  writeFileSync(join(root, "package.json"), rootPackageJson);
  writeFileSync(join(root, "apps", "mobile", "app.json"), mobileAppJson);
  writeFileSync(join(root, "supabase", "config.toml"), supabaseConfigToml);

  return root;
}

export function readFixtureFile(root: string, relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

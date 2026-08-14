import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { stdout } from "node:process";
import { fileURLToPath } from "node:url";

/**
 * Downloads the native assets the Markdown renderer compiles into the app: the
 * tree-sitter grammars behind code highlighting and the framework behind iOS
 * math. They are kept out of the published package because they are large, so
 * the library ships a script that fetches them once and does nothing on every
 * later run.
 *
 * Bun does not run a dependency's own install scripts, so the repository runs
 * this one itself.
 *
 * The usual way out is to name the package in the root `trustedDependencies`,
 * and it does not reach this one. On Bun 1.3.6 that was tried as a workspace
 * dependency and as a direct root dependency, followed by `bun pm trust`, then
 * again with the lockfile and the global cache thrown away. Bun answered every
 * time that the package has no scripts to run, while a control package with the
 * same kind of `postinstall` installed normally. The script is declared both in
 * the registry metadata, which even carries `hasInstallScript: true`, and in the
 * installed manifest, so there is nothing to fix on this side. Retry
 * `trustedDependencies` when Bun moves on; until then, deleting this leaves the
 * assets undownloaded.
 *
 * Missing assets are not fatal, so this stays a best-effort step: the library
 * treats them as the feature being off and builds anyway, which is what lets a
 * machine with no network access still get a working install.
 */
const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);
const assetScript = resolve(
  repositoryRoot,
  "apps/mobile/node_modules/react-native-enriched-markdown/postinstall.mjs"
);

function write(message: string) {
  stdout.write(`${message}\n`);
}

if (existsSync(assetScript)) {
  const result = spawnSync("node", [assetScript], {
    cwd: repositoryRoot,
    stdio: ["ignore", "inherit", "inherit"],
  });

  if (result.status !== 0) {
    write(
      "Markdown 렌더러의 네이티브 자산을 받지 못했습니다. 코드 강조와 수식 없이 빌드됩니다."
    );
    write(`다시 받으려면: node ${assetScript}`);
  }
} else {
  // An install that left the mobile app out, which is a complete install for
  // whatever it did cover.
  write(
    "apps/mobile이 설치되지 않아 Markdown 렌더러의 네이티브 자산 준비를 건너뜁니다."
  );
}

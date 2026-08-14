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
 * this one itself. It stays a best-effort step: the library treats a missing
 * asset as the feature being off and builds anyway, so a machine without
 * network access still gets a working install rather than a failed one.
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

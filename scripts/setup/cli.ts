import { dirname, resolve } from "node:path";
import { argv, exit, stderr, stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { runSetup } from "./setup";

const repositoryRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  ".."
);

function write(message: string) {
  stdout.write(`${message}\n`);
}

async function main() {
  const readline = createInterface({ input: stdin, output: stdout });

  try {
    await runSetup({
      argv: argv.slice(2),
      io: {
        log: write,
        prompt: (question) => {
          // `question()` never settles once stdin is at EOF, so without this an
          // unattended run would print the prompt and exit 0 having applied
          // nothing — or block until the CI job times out.
          if (!stdin.isTTY) {
            throw new Error(
              `입력을 받을 수 없습니다 (${question.trim()}). 비대화형 실행에는 --project-slug, --display-name, --mobile-app-id, --yes를 모두 넘겨야 합니다.`
            );
          }

          return readline.question(question);
        },
      },
      root: repositoryRoot,
    });
  } finally {
    readline.close();
  }
}

main().catch((error: unknown) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  exit(1);
});

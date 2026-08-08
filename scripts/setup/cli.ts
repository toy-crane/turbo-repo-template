import { dirname, resolve } from "node:path";
import { argv, exit, stdin, stdout } from "node:process";
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
      io: { log: write, prompt: (question) => readline.question(question) },
      root: repositoryRoot,
    });
  } finally {
    readline.close();
  }
}

main().catch((error: unknown) => {
  write(error instanceof Error ? error.message : String(error));
  exit(1);
});

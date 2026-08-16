import process, { argv, cwd, exit, stderr, stdout } from "node:process";

import { parseDevCommand } from "./options";
import type { SessionIo } from "./session/context";
import { startSession } from "./session/start";
import { showStatus } from "./session/status";
import { removeSession, stopSession } from "./session/stop";

const io: SessionIo = {
  log: (message: string) => {
    stdout.write(`${message}\n`);
  },
};

async function main(): Promise<void> {
  const command = parseDevCommand(argv.slice(2));
  const directory = cwd();

  if (command.kind === "stop") {
    await stopSession({ cwd: directory, io });

    return;
  }

  if (command.kind === "remove") {
    await removeSession({ cwd: directory, io });

    return;
  }

  if (command.kind === "status") {
    await showStatus({ cwd: directory, io });

    return;
  }

  const result = await startSession({
    clear: command.clear,
    cwd: directory,
    io,
    platforms: command.platforms,
  });
  const buildLabels = {
    built: "이번에 새로 만든 Development Build",
    installed: "저장소 공용 빌드를 설치",
    reused: "기기에 있던 빌드를 그대로 사용",
  };

  io.log("");

  for (const success of result.successes) {
    io.log(`${success.platform} 개발 세션이 준비됐습니다.`);
    io.log(`  기기      ${success.deviceId}`);
    io.log(`  빌드      ${buildLabels[success.build]}`);
  }

  io.log(`  붙은 플랫폼  ${result.activePlatforms.join(", ")}`);
  io.log(`  slot      ${result.slot}`);
  io.log(`  API       http://127.0.0.1:${result.apiPort}`);
  io.log(`  Metro     http://127.0.0.1:${result.metroPort}`);
  io.log(`  로그      ${result.logDirectory}`);

  if (result.failures.length > 0) {
    io.log("");

    for (const failure of result.failures) {
      io.log(
        `${failure.platform}를 시작하지 못했습니다. bun run dev ${failure.platform}로 다시 시도해 주세요.\n${failure.message}`
      );
    }

    // The session that did come up stays alive; only the exit code says that
    // part of the request failed.
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  exit(1);
});

import { argv, cwd, exit, stderr, stdout } from "node:process";

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
    platform: command.platform,
  });
  const build = {
    built: "이번에 새로 만든 Development Build",
    installed: "저장소 공용 빌드를 설치",
    reused: "기기에 있던 빌드를 그대로 사용",
  }[result.build];

  const others = result.activePlatforms.filter(
    (platform) => platform !== result.platform
  );

  io.log("");
  io.log(`${result.platform} 개발 세션이 준비됐습니다.`);

  if (others.length > 0) {
    io.log(`  함께 실행 ${others.join(", ")}`);
  }

  io.log(`  기기      ${result.deviceId}`);
  io.log(`  slot      ${result.slot}`);
  io.log(`  API       http://127.0.0.1:${result.apiPort}`);
  io.log(`  Metro     http://127.0.0.1:${result.metroPort}`);
  io.log(`  빌드      ${build}`);
  io.log(`  로그      ${result.logDirectory}`);
}

main().catch((error: unknown) => {
  stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  exit(1);
});

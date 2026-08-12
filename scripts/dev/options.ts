export type Platform = "android" | "ios";

export type DevCommand =
  | { kind: "remove" }
  | { kind: "start"; platform: Platform }
  | { kind: "stop" };

export const USAGE = [
  "사용법: bun run dev <ios|android>",
  "",
  "  bun run dev ios       iOS 개발 세션을 시작합니다.",
  "  bun run dev android   Android 개발 세션을 시작합니다.",
  "  bun run dev:stop      현재 worktree의 개발 세션을 종료합니다.",
  "  bun run dev:remove    현재 worktree의 개발 자원을 정리하고 기기를 풀로 돌려놓습니다.",
].join("\n");

const PLATFORMS: Platform[] = ["android", "ios"];

function isPlatform(value: string): value is Platform {
  return (PLATFORMS as string[]).includes(value);
}

/**
 * The platform argument is required. A bare `bun run dev` starts nothing
 * because guessing the platform from running devices makes the same command
 * behave differently on two machines.
 */
export function parseDevCommand(argv: string[]): DevCommand {
  const args = argv.filter((argument) => argument !== "--");

  if (args[0] === "stop" && args.length === 1) {
    return { kind: "stop" };
  }

  if (args[0] === "remove" && args.length === 1) {
    return { kind: "remove" };
  }

  const [platform, ...rest] = args;

  if (!platform) {
    throw new Error(`실행할 플랫폼을 지정해 주세요.\n\n${USAGE}`);
  }

  if (rest.length > 0) {
    throw new Error(`인수가 너무 많습니다: ${args.join(" ")}.\n\n${USAGE}`);
  }

  if (!isPlatform(platform)) {
    throw new Error(`알 수 없는 플랫폼입니다: ${platform}.\n\n${USAGE}`);
  }

  return { kind: "start", platform };
}

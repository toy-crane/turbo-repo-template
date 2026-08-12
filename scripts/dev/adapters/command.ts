import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

export interface CommandResult {
  code: number;
  stderr: string;
  stdout: string;
}

export interface CommandOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export interface RunToLogOptions extends CommandOptions {
  logPath: string;
  onOutput?: (text: string) => void;
}

function currentEnv(): Record<string, string> {
  return process.env as Record<string, string>;
}

function collect(
  argv: string[],
  options: CommandOptions,
  onChunk?: (stream: "stderr" | "stdout", text: string) => void
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const [command, ...args] = argv;

    if (!command) {
      reject(new Error("실행할 명령이 비어 있습니다."));

      return;
    }

    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? currentEnv(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (text: string) => {
      stdout += text;
      onChunk?.("stdout", text);
    });
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (text: string) => {
      stderr += text;
      onChunk?.("stderr", text);
    });
    child.once("error", reject);
    child.once("close", (code) => {
      resolve({ code: code ?? 1, stderr, stdout });
    });
  });
}

export function run(
  argv: string[],
  options: CommandOptions = {}
): Promise<CommandResult> {
  return collect(argv, options);
}

export async function runOrThrow(
  argv: string[],
  options: CommandOptions = {}
): Promise<string> {
  const result = await run(argv, options);

  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim();

    throw new Error(
      `명령이 실패했습니다: ${argv.join(" ")} (종료 코드 ${result.code})${detail ? `\n${detail}` : ""}`
    );
  }

  return result.stdout;
}

/**
 * For the long commands: a native build is minutes of output nobody wants on
 * screen, but every line has to survive for when the build fails.
 */
export function runToLog(
  argv: string[],
  { logPath, onOutput, ...options }: RunToLogOptions
): Promise<CommandResult> {
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `\n$ ${argv.join(" ")}\n`);

  return collect(argv, options, (_stream, text) => {
    appendFileSync(logPath, text);
    onOutput?.(text);
  });
}

import { describe, expect, test } from "bun:test";
import { readdirSync, rmSync } from "node:fs";
import { join } from "node:path";

import { createTemplateFixture, readFixtureFile } from "./fixture";
import { runSetup } from "./setup";

function createIo(answers: string[] = []) {
  const queue = [...answers];
  const messages: string[] = [];

  return {
    io: {
      log: (message: string) => {
        messages.push(message);
      },
      prompt: (question: string) => {
        messages.push(question);
        const answer = queue.shift();

        if (answer === undefined) {
          throw new Error(`Unexpected prompt: ${question}`);
        }

        return Promise.resolve(answer);
      },
    },
    messages,
    remainingAnswers: queue,
  };
}

function withFixture(run: (root: string) => Promise<void>) {
  return async () => {
    const root = createTemplateFixture();

    try {
      await run(root);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  };
}

const kebabCaseMessage = /kebab-case/;
const reverseDnsMessage = /reverse-DNS/;
const unknownOptionMessage = /알 수 없는 옵션/;

const nonInteractiveArgv = [
  "--project-slug",
  "aurora-notes",
  "--display-name",
  "Aurora Notes",
  "--mobile-app-id",
  "com.aurora.notes",
  "--yes",
];

describe("runSetup", () => {
  test(
    "비대화형 실행이 모든 도구의 프로젝트 식별자를 입력값으로 바꾼다",
    withFixture(async (root) => {
      const { io } = createIo();

      const result = await runSetup({ argv: nonInteractiveArgv, io, root });

      expect(result.status).toBe("applied");
      expect(readFixtureFile(root, "package.json")).toContain(
        '"name": "aurora-notes"'
      );

      const appJson = readFixtureFile(root, "apps/mobile/app.json");

      expect(appJson).toContain('"slug": "aurora-notes"');
      expect(appJson).toContain('"scheme": "aurora-notes"');
      expect(appJson).toContain('"name": "Aurora Notes"');
      expect(appJson).toContain('"bundleIdentifier": "com.aurora.notes"');
      expect(appJson).toContain('"package": "com.aurora.notes"');
      expect(readFixtureFile(root, "supabase/config.toml")).toContain(
        'project_id = "aurora-notes"'
      );
    })
  );

  test(
    "local database 이름과 env 파일은 건드리지 않는다",
    withFixture(async (root) => {
      const { io } = createIo();

      await runSetup({ argv: nonInteractiveArgv, io, root });

      const config = readFixtureFile(root, "supabase/config.toml");

      expect(config).toContain("port = 54322");
      expect(config).not.toContain("aurora-notes/postgres");
      expect(
        readdirSync(root).filter((entry) => entry.startsWith(".env"))
      ).toEqual([]);
      expect(
        readdirSync(join(root, "apps", "mobile")).filter((entry) =>
          entry.startsWith(".env")
        )
      ).toEqual([]);
    })
  );

  test(
    "대화형 실행이 세 값을 순서대로 묻고 확인을 받은 뒤 적용한다",
    withFixture(async (root) => {
      const { io, messages, remainingAnswers } = createIo([
        "aurora-notes",
        "Aurora Notes",
        "com.aurora.notes",
        "y",
      ]);

      const result = await runSetup({ argv: [], io, root });

      expect(result.status).toBe("applied");
      expect(remainingAnswers).toEqual([]);

      const questions = messages.filter((message) => message.startsWith("1/3"));

      expect(questions).toHaveLength(1);
      expect(messages.join("\n")).toContain(
        "Expo slug: turbo-repo-mobile → aurora-notes"
      );
      expect(readFixtureFile(root, "package.json")).toContain(
        '"name": "aurora-notes"'
      );
    })
  );

  test(
    "확인을 거절하면 어떤 파일도 바꾸지 않는다",
    withFixture(async (root) => {
      const before = readFixtureFile(root, "apps/mobile/app.json");
      const { io } = createIo(["n"]);

      const result = await runSetup({
        argv: nonInteractiveArgv.slice(0, -1),
        io,
        root,
      });

      expect(result.status).toBe("cancelled");
      expect(readFixtureFile(root, "apps/mobile/app.json")).toBe(before);
      expect(readFixtureFile(root, "package.json")).toContain(
        '"name": "turbo-repo-template"'
      );
    })
  );

  test(
    "형식이 잘못된 값은 적용 전에 거절한다",
    withFixture(async (root) => {
      const before = readFixtureFile(root, "package.json");
      const { io } = createIo();

      await expect(
        runSetup({
          argv: [
            "--project-slug",
            "Aurora Notes",
            "--display-name",
            "Aurora Notes",
            "--mobile-app-id",
            "com.aurora.notes",
            "--yes",
          ],
          io,
          root,
        })
      ).rejects.toThrow(kebabCaseMessage);

      await expect(
        runSetup({
          argv: [
            "--project-slug",
            "aurora-notes",
            "--display-name",
            "Aurora Notes",
            "--mobile-app-id",
            "aurora-notes",
            "--yes",
          ],
          io,
          root,
        })
      ).rejects.toThrow(reverseDnsMessage);

      expect(readFixtureFile(root, "package.json")).toBe(before);
    })
  );

  test(
    "대화형에서 잘못된 값을 받으면 이유를 알리고 다시 묻는다",
    withFixture(async (root) => {
      const { io, messages } = createIo([
        "Aurora Notes",
        "aurora-notes",
        "Aurora Notes",
        "com.aurora.notes",
        "y",
      ]);

      const result = await runSetup({ argv: [], io, root });

      expect(result.status).toBe("applied");
      expect(messages.join("\n")).toContain("kebab-case");
      expect(readFixtureFile(root, "package.json")).toContain(
        '"name": "aurora-notes"'
      );
    })
  );

  test(
    "이미 설정된 저장소에서는 현재 값을 보여주고 변경 없이 끝낸다",
    withFixture(async (root) => {
      await runSetup({ argv: nonInteractiveArgv, io: createIo().io, root });

      const configured = readFixtureFile(root, "apps/mobile/app.json");
      const { io, messages } = createIo();

      const result = await runSetup({
        argv: [
          "--project-slug",
          "second-try",
          "--display-name",
          "Second Try",
          "--mobile-app-id",
          "com.second.try",
          "--yes",
        ],
        io,
        root,
      });

      expect(result.status).toBe("already-configured");
      expect(messages.join("\n")).toContain("aurora-notes");
      expect(messages.join("\n")).toContain("--force");
      expect(readFixtureFile(root, "apps/mobile/app.json")).toBe(configured);
    })
  );

  test(
    "--force를 주면 설정된 저장소에도 다시 적용한다",
    withFixture(async (root) => {
      await runSetup({ argv: nonInteractiveArgv, io: createIo().io, root });

      const { io } = createIo();
      const result = await runSetup({
        argv: [
          "--project-slug",
          "second-try",
          "--display-name",
          "Second Try",
          "--mobile-app-id",
          "com.second.try",
          "--yes",
          "--force",
        ],
        io,
        root,
      });

      expect(result.status).toBe("applied");
      expect(readFixtureFile(root, "supabase/config.toml")).toContain(
        'project_id = "second-try"'
      );
      expect(readFixtureFile(root, "apps/mobile/app.json")).toContain(
        '"package": "com.second.try"'
      );
    })
  );

  test(
    "같은 값으로 --force 재실행하면 변경 없이 끝낸다",
    withFixture(async (root) => {
      await runSetup({ argv: nonInteractiveArgv, io: createIo().io, root });

      const applied = readFixtureFile(root, "apps/mobile/app.json");
      const { io } = createIo();

      const result = await runSetup({
        argv: [...nonInteractiveArgv, "--force"],
        io,
        root,
      });

      expect(result.status).toBe("unchanged");
      expect(readFixtureFile(root, "apps/mobile/app.json")).toBe(applied);
    })
  );

  test("알 수 없는 옵션은 실행 전에 거절한다", async () => {
    const root = createTemplateFixture();

    try {
      await expect(
        runSetup({
          argv: ["--project-name", "aurora"],
          io: createIo().io,
          root,
        })
      ).rejects.toThrow(unknownOptionMessage);
    } finally {
      rmSync(root, { force: true, recursive: true });
    }
  });
});

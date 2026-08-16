import { afterEach, describe, expect, test } from "bun:test";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  avdDirectory,
  readAvdDisplayName,
  writeAvdDisplayName,
} from "./android";

const homes: string[] = [];

afterEach(() => {
  for (const home of homes.splice(0)) {
    rmSync(home, { force: true, recursive: true });
  }
});

function temporaryHome(): string {
  const home = mkdtempSync(join(tmpdir(), "android-test-"));

  homes.push(home);

  return home;
}

function homeWithAvd(avdName: string, config: string): string {
  const home = temporaryHome();

  mkdirSync(avdDirectory(avdName, home), { recursive: true });
  writeFileSync(join(avdDirectory(avdName, home), "config.ini"), config);

  return home;
}

describe("AVD 표시 이름", () => {
  test("표시 이름을 쓰고 다시 읽는다", () => {
    const home = homeWithAvd("example_dev_1", "hw.device.name=pixel_9_pro\n");

    writeAvdDisplayName("example_dev_1", "example slot 1", home);

    expect(readAvdDisplayName("example_dev_1", home)).toBe("example slot 1");
    expect(
      readFileSync(
        join(avdDirectory("example_dev_1", home), "config.ini"),
        "utf8"
      )
    ).toContain("hw.device.name=pixel_9_pro");
  });

  test("같은 키가 있으면 줄을 바꿔 쓴다", () => {
    const home = homeWithAvd(
      "example_dev_1",
      "avd.ini.displayname=old name\nhw.device.name=pixel_9_pro\n"
    );

    writeAvdDisplayName("example_dev_1", "example slot 2", home);

    const contents = readFileSync(
      join(avdDirectory("example_dev_1", home), "config.ini"),
      "utf8"
    );

    expect(readAvdDisplayName("example_dev_1", home)).toBe("example slot 2");
    expect(contents).not.toContain("old name");
  });

  test("표시 이름을 지우면 키가 사라진다", () => {
    const home = homeWithAvd(
      "example_dev_1",
      "avd.ini.displayname=example slot 1\nhw.device.name=pixel_9_pro\n"
    );

    writeAvdDisplayName("example_dev_1", undefined, home);

    expect(readAvdDisplayName("example_dev_1", home)).toBeUndefined();
    expect(
      readFileSync(
        join(avdDirectory("example_dev_1", home), "config.ini"),
        "utf8"
      )
    ).toContain("hw.device.name=pixel_9_pro");
  });

  test("config.ini가 없으면 조용히 지나간다", () => {
    const home = temporaryHome();

    expect(() =>
      writeAvdDisplayName("missing_avd", "example slot 1", home)
    ).not.toThrow();
    expect(readAvdDisplayName("missing_avd", home)).toBeUndefined();
  });
});

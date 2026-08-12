import { describe, expect, test } from "bun:test";

import { planBuild } from "./builds";

describe("planBuild", () => {
  test("기기에 같은 fingerprint가 있으면 빌드와 설치를 모두 건너뛴다", () => {
    expect(
      planBuild({
        artifactPath: "/cache/builds/ios/fp/App.app",
        fingerprint: "fp",
        installedFingerprint: "fp",
      })
    ).toEqual({ action: "keep" });
  });

  test("JavaScript만 바꾸면 fingerprint가 같아 다시 빌드하지 않는다", () => {
    expect(
      planBuild({
        artifactPath: undefined,
        fingerprint: "fp",
        installedFingerprint: "fp",
      })
    ).toEqual({ action: "keep" });
  });

  test("기기에는 없지만 공용 빌드가 있으면 그 결과를 설치한다", () => {
    expect(
      planBuild({
        artifactPath: "/cache/builds/ios/fp/App.app",
        fingerprint: "fp",
        installedFingerprint: null,
      })
    ).toEqual({
      action: "install",
      artifactPath: "/cache/builds/ios/fp/App.app",
    });
  });

  test("fingerprint가 달라지면 기존 공용 빌드를 쓰지 않고 새로 빌드한다", () => {
    expect(
      planBuild({
        artifactPath: undefined,
        fingerprint: "new-fp",
        installedFingerprint: "old-fp",
      })
    ).toEqual({ action: "build" });
  });

  test("기기에 다른 빌드가 있어도 새 fingerprint의 공용 빌드가 있으면 설치한다", () => {
    expect(
      planBuild({
        artifactPath: "/cache/builds/ios/new-fp/App.app",
        fingerprint: "new-fp",
        installedFingerprint: "old-fp",
      })
    ).toEqual({
      action: "install",
      artifactPath: "/cache/builds/ios/new-fp/App.app",
    });
  });

  test("공용 빌드도 기기 설치도 없으면 빌드한다", () => {
    expect(
      planBuild({
        artifactPath: undefined,
        fingerprint: "fp",
        installedFingerprint: null,
      })
    ).toEqual({ action: "build" });
  });
});

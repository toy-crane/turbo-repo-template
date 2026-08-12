import { describe, expect, test } from "bun:test";

import { allocateSlot, apiPort, metroPort } from "./slots";

const allFree = () => true;
const noFreeSlotMessage = /빈 slot을 찾지 못했습니다/;

describe("포트 계산", () => {
  test("명세의 slot별 포트를 만든다", () => {
    expect([metroPort(0), metroPort(1), metroPort(2)]).toEqual([
      8081, 8091, 8101,
    ]);
    expect([apiPort(0), apiPort(1), apiPort(2)]).toEqual([3900, 3910, 3920]);
  });
});

describe("allocateSlot", () => {
  test("첫 worktree는 slot 0을 받는다", () => {
    expect(
      allocateSlot({
        currentSlot: undefined,
        isPortFree: allFree,
        takenSlots: new Set(),
      })
    ).toEqual({ changed: true, slot: 0 });
  });

  test("다른 worktree가 쓰는 slot은 건너뛴다", () => {
    expect(
      allocateSlot({
        currentSlot: undefined,
        isPortFree: allFree,
        takenSlots: new Set([0, 1]),
      })
    ).toEqual({ changed: true, slot: 2 });
  });

  test("기존 worktree는 같은 slot을 계속 쓴다", () => {
    expect(
      allocateSlot({
        currentSlot: 3,
        isPortFree: allFree,
        takenSlots: new Set([0, 1]),
      })
    ).toEqual({ changed: false, slot: 3 });
  });

  test("첫 배정은 두 포트가 모두 비어 있는 slot만 쓴다", () => {
    // slot 0은 Metro 포트만, slot 1은 API 포트만 막혀 있다.
    const isPortFree = (port: number) => port !== 8081 && port !== 3910;

    expect(
      allocateSlot({
        currentSlot: undefined,
        isPortFree,
        takenSlots: new Set(),
      })
    ).toEqual({ changed: true, slot: 2 });
  });

  test("알 수 없는 프로세스가 저장된 포트를 쓰면 다른 slot으로 옮긴다", () => {
    const isPortFree = (port: number) => port !== 3910;

    expect(
      allocateSlot({
        currentSlot: 1,
        isPortFree,
        takenSlots: new Set([0]),
      })
    ).toEqual({ changed: true, slot: 2 });
  });

  test("자기 세션이 쓰는 포트 때문에 slot을 옮기지 않는다", () => {
    // 다시 시작할 때 살아 있는 자기 API와 Metro가 포트를 잡고 있다.
    expect(
      allocateSlot({
        currentSlot: 1,
        isPortFree: () => false,
        ownPorts: new Set([8091, 3910]),
        takenSlots: new Set([0]),
      })
    ).toEqual({ changed: false, slot: 1 });
  });

  test("빈 slot이 없으면 남의 프로세스를 죽이지 않고 실패한다", () => {
    expect(() =>
      allocateSlot({
        currentSlot: undefined,
        isPortFree: () => false,
        takenSlots: new Set(),
      })
    ).toThrow(noFreeSlotMessage);
  });
});

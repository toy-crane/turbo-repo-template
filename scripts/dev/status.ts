import { PLATFORMS, type Platform } from "./options";
import { apiPort, metroPort } from "./slots";
import type {
  ProcessKind,
  ProcessRecord,
  RepositoryState,
  WorktreeRecord,
} from "./state";

export interface StatusProcess {
  alive: boolean;
  /** Recorded pid; absent when the session is stopped. */
  pid: number | undefined;
  /** The slot's port, shown even while nothing listens on it. */
  port: number;
}

export interface StatusDevice {
  booted: boolean;
  deviceId: string;
  /** Recorded here but no longer on the machine. Unreadable tools stay false. */
  missing: boolean;
  /** iOS display name; Android devices are addressed by their id. */
  name: string | undefined;
  platform: Platform;
  /** The adb serial while the emulator runs. */
  serial: string | undefined;
}

export interface WorktreeStatus {
  activePlatforms: Platform[];
  api: StatusProcess;
  devices: StatusDevice[];
  /** Git no longer lists this worktree; the next start reclaims it. */
  gone: boolean;
  label: string;
  metro: StatusProcess;
  path: string;
  slot: number;
}

export interface StatusReport {
  /** Pool devices no worktree holds right now. */
  idle: StatusDevice[];
  worktrees: WorktreeStatus[];
}

export interface StatusFacts {
  /** Serial per running AVD. Empty when adb is unavailable. */
  androidSerials: ReadonlyMap<string, string>;
  bootedIos: ReadonlySet<string>;
  /** A platform left out could not be read, so nothing of it is "missing". */
  existingDeviceIds: Partial<Record<Platform, ReadonlySet<string>>>;
  /** Display name per simulator udid; undefined when simctl is unavailable. */
  iosNames: ReadonlyMap<string, string> | undefined;
  isProcessAlive: (
    worktreePath: string,
    kind: ProcessKind,
    record: ProcessRecord
  ) => boolean;
  worktreeExists: (path: string) => boolean;
}

function statusDevice(
  platform: Platform,
  deviceId: string,
  facts: StatusFacts
): StatusDevice {
  const known = facts.existingDeviceIds[platform];
  const serial =
    platform === "android" ? facts.androidSerials.get(deviceId) : undefined;

  return {
    booted:
      platform === "ios" ? facts.bootedIos.has(deviceId) : serial !== undefined,
    deviceId,
    missing: known !== undefined && !known.has(deviceId),
    name: platform === "ios" ? facts.iosNames?.get(deviceId) : undefined,
    platform,
    serial,
  };
}

function statusProcess(
  worktreePath: string,
  kind: ProcessKind,
  record: ProcessRecord | undefined,
  slotPort: number,
  facts: StatusFacts
): StatusProcess {
  if (!record) {
    return { alive: false, pid: undefined, port: slotPort };
  }

  return {
    alive: facts.isProcessAlive(worktreePath, kind, record),
    pid: record.pid,
    port: record.port,
  };
}

function worktreeStatus(
  path: string,
  record: WorktreeRecord,
  facts: StatusFacts
): WorktreeStatus {
  const devices: StatusDevice[] = [];

  for (const platform of PLATFORMS) {
    const deviceId = record.devices[platform];

    if (deviceId) {
      devices.push(statusDevice(platform, deviceId, facts));
    }
  }

  return {
    activePlatforms: [...record.activePlatforms],
    api: statusProcess(
      path,
      "api",
      record.processes.api,
      apiPort(record.slot),
      facts
    ),
    devices,
    gone: !facts.worktreeExists(path),
    label: record.label,
    metro: statusProcess(
      path,
      "metro",
      record.processes.metro,
      metroPort(record.slot),
      facts
    ),
    path,
    slot: record.slot,
  };
}

/**
 * A pure projection of the recorded state: it flags what no longer matches the
 * machine but never repairs anything. Reclaiming stays with the start commands.
 */
export function buildStatusReport(
  state: RepositoryState,
  facts: StatusFacts
): StatusReport {
  const worktrees = Object.entries(state.worktrees)
    .map(([path, record]) => worktreeStatus(path, record, facts))
    .sort((left, right) => left.slot - right.slot);

  const idle: StatusDevice[] = [];

  for (const platform of PLATFORMS) {
    for (const [deviceId, device] of Object.entries(
      state.devicePool[platform]
    )) {
      if (!device.leasedTo) {
        idle.push(statusDevice(platform, deviceId, facts));
      }
    }
  }

  return { idle, worktrees };
}

function processLine(kind: string, entry: StatusProcess): string {
  const life = entry.alive ? `실행 중 (pid ${entry.pid})` : "중지됨";

  return `  ${kind.padEnd(9)}${String(entry.port).padEnd(6)}${life}`;
}

function deviceLine(device: StatusDevice): string {
  const parts: string[] = [`  ${device.platform.padEnd(9)}`];

  if (device.platform === "ios") {
    parts.push(device.name ?? "(이름을 읽지 못함)", ` UDID ${device.deviceId}`);
    parts.push(device.booted ? "  부팅됨" : "  꺼짐");
  } else {
    parts.push(device.deviceId);
    parts.push(device.serial ? `  serial ${device.serial}  실행 중` : "  꺼짐");
  }

  if (device.missing) {
    parts.push("  (기기가 사라짐, 다음 시작 명령이 회수)");
  }

  return parts.join("");
}

export function renderStatusReport(report: StatusReport): string[] {
  if (report.worktrees.length === 0 && report.idle.length === 0) {
    return ["개발 세션 상태가 없습니다."];
  }

  const lines: string[] = [];

  for (const worktree of report.worktrees) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push(`${worktree.label || worktree.path} (slot ${worktree.slot})`);
    lines.push(`  경로     ${worktree.path}`);

    if (worktree.gone) {
      lines.push(
        "  Git worktree 목록에서 사라졌습니다. 다음 시작 명령이 회수합니다."
      );
    }

    lines.push(processLine("API", worktree.api));
    lines.push(processLine("Metro", worktree.metro));
    lines.push(
      `  붙은 플랫폼  ${
        worktree.activePlatforms.length > 0
          ? worktree.activePlatforms.join(", ")
          : "없음"
      }`
    );

    for (const device of worktree.devices) {
      lines.push(deviceLine(device));
    }
  }

  if (report.idle.length > 0) {
    if (lines.length > 0) {
      lines.push("");
    }

    lines.push("풀에서 대기 중인 기기");

    for (const device of report.idle) {
      lines.push(deviceLine(device));
    }
  }

  return lines;
}

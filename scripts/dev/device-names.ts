import type { SimulatorDevice } from "./adapters/ios";

/**
 * The device a worktree holds carries the slot in its display name, so the
 * device lists a person or a tool reads name exactly what `dev:status` and the
 * start output call this worktree. Pool devices keep neutral `-dev-` names.
 */
export function simulatorSlotName(slug: string, slot: number): string {
  return `${slug}-slot-${slot}`;
}

/** The AVD display name; the id itself cannot change safely. */
export function androidDisplayName(slug: string, slot: number): string {
  return `${slug} slot ${slot}`;
}

export function poolNamePrefix(slug: string): string {
  return `${slug}-dev-`;
}

export function nextName(prefix: string, taken: ReadonlySet<string>): string {
  for (let index = 1; ; index += 1) {
    const name = `${prefix}${index}`;

    if (!taken.has(name)) {
      return name;
    }
  }
}

export interface SimulatorRename {
  name: string;
  udid: string;
}

/**
 * Renames the leased device to its slot name. A different device still holding
 * that name goes back to a free pool name first: two simulators with the same
 * name would make every name-based tool ambiguous, which is the exact mistake
 * this naming exists to prevent. A holder that another worktree still leases
 * is not touched; that worktree's own next start renames it, and until then
 * this device keeps its old name rather than creating the duplicate.
 */
export function planSimulatorRename(
  devices: readonly SimulatorDevice[],
  udid: string,
  desired: string,
  poolPrefix: string,
  leasedElsewhere: ReadonlySet<string> = new Set()
): SimulatorRename[] {
  const current = devices.find((entry) => entry.udid === udid);

  if (!current || current.name === desired) {
    return [];
  }

  const steps: SimulatorRename[] = [];
  const taken = new Set(devices.map((entry) => entry.name));

  for (const other of devices) {
    if (other.udid === udid || other.name !== desired) {
      continue;
    }

    if (leasedElsewhere.has(other.udid)) {
      return [];
    }

    const free = nextName(poolPrefix, taken);

    taken.add(free);
    steps.push({ name: free, udid: other.udid });
  }

  steps.push({ name: desired, udid });

  return steps;
}

/** Returns a released device to a free pool name so no stale slot name lingers. */
export function planPoolRename(
  devices: readonly SimulatorDevice[],
  udid: string,
  poolPrefix: string
): SimulatorRename | undefined {
  const current = devices.find((entry) => entry.udid === udid);

  if (!current || current.name.startsWith(poolPrefix)) {
    return;
  }

  const taken = new Set(devices.map((entry) => entry.name));

  return { name: nextName(poolPrefix, taken), udid };
}

const METRO_BASE_PORT = 8081;
const API_BASE_PORT = 3900;
const SLOT_STRIDE = 10;

export const MAX_SLOT = 32;

export function metroPort(slot: number): number {
  return METRO_BASE_PORT + slot * SLOT_STRIDE;
}

export function apiPort(slot: number): number {
  return API_BASE_PORT + slot * SLOT_STRIDE;
}

export interface SlotAllocation {
  changed: boolean;
  slot: number;
}

export interface AllocateSlotInput {
  /** The slot this worktree used last time, if it has one. */
  currentSlot: number | undefined;
  isPortFree: (port: number) => boolean;
  /**
   * Ports this worktree's own running session holds. Without them a restart
   * would read its own API and Metro as somebody else's and move slot.
   */
  ownPorts?: ReadonlySet<number>;
  /** Slots held by the other worktrees of this repository. */
  takenSlots: ReadonlySet<number>;
}

function isSlotUsable(
  slot: number,
  { isPortFree, ownPorts, takenSlots }: AllocateSlotInput
): boolean {
  const usable = (port: number) => ownPorts?.has(port) || isPortFree(port);

  return (
    !takenSlots.has(slot) && usable(metroPort(slot)) && usable(apiPort(slot))
  );
}

/**
 * A worktree keeps its slot for as long as both its ports stay free. When some
 * other program has taken one of them the session moves to a free slot instead
 * of killing that process — it is not ours to stop.
 */
export function allocateSlot(input: AllocateSlotInput): SlotAllocation {
  if (
    input.currentSlot !== undefined &&
    isSlotUsable(input.currentSlot, input)
  ) {
    return { changed: false, slot: input.currentSlot };
  }

  for (let slot = 0; slot <= MAX_SLOT; slot += 1) {
    if (isSlotUsable(slot, input)) {
      return { changed: input.currentSlot !== slot, slot };
    }
  }

  throw new Error(
    `빈 slot을 찾지 못했습니다. slot 0부터 ${MAX_SLOT}까지의 Metro(${metroPort(0)}부터)와 API(${apiPort(0)}부터) 포트가 모두 사용 중입니다.`
  );
}

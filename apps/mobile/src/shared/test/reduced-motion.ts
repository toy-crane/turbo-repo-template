/**
 * What `useReducedMotion()` answers under Jest.
 *
 * The shared setup stands in for Reanimated before any test file loads, so a
 * test that needs the other answer cannot take that mock over — the module is
 * already in hand by then. It flips this switch instead, and puts it back in
 * `beforeEach` so the next test starts from motion being allowed.
 */
export const mockReducedMotion = { isOn: false };

import { useNavigation } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The native stack tells a screen when its own transition has finished.
 * `useNavigation` types only the events every navigator shares, so the shape of
 * the one event this listens for is declared here. The payload is optional all
 * the way down because this declaration is an assertion about someone else's
 * event: a reshaped payload should still let the screen carry on.
 */
interface ScreenTransition {
  addListener: (
    event: "transitionEnd",
    listener: (payload: { data?: { closing?: boolean } }) => void
  ) => () => void;
}

/**
 * Whether this screen has finished arriving.
 *
 * Screens that open the keyboard on entry wait for this instead of focusing at
 * mount. Focusing while the push is still running makes iOS carry the rising
 * keyboard along with the screen, so it slides in from the right and the
 * content below then climbs from the bottom — two directions for one arrival.
 * Waiting for the transition to finish leaves the keyboard rising on its own.
 *
 * Only the arriving transition counts. Closing the screen ends a transition
 * too, and that one must not read as an arrival.
 */
export function useScreenArrival(): boolean {
  const navigation = useNavigation<ScreenTransition>();
  const [hasArrived, setHasArrived] = useState(false);

  useEffect(
    () =>
      navigation.addListener("transitionEnd", ({ data }) => {
        if (!data?.closing) {
          setHasArrived(true);
        }
      }),
    [navigation]
  );

  return hasArrived;
}

/**
 * A ref for the control that should hold the caret once the screen has
 * arrived. Attach it to the input and the keyboard opens on its own.
 *
 * It takes the focus twice over: when the arrival lands, and whenever a new
 * control attaches after that. The second case is what keeps a screen that
 * remounts its input — to clear a wrong code, say — from losing the caret.
 */
export function useFocusOnArrival<T extends { focus: () => void }>(): (
  control: T | null
) => void {
  const hasArrived = useScreenArrival();
  const controlRef = useRef<T | null>(null);
  const arrivedRef = useRef(false);

  useEffect(() => {
    arrivedRef.current = hasArrived;

    if (hasArrived) {
      controlRef.current?.focus();
    }
  }, [hasArrived]);

  return useCallback((control: T | null) => {
    controlRef.current = control;

    if (control && arrivedRef.current) {
      control.focus();
    }
  }, []);
}

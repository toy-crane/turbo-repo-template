import Svg, { Path } from "react-native-svg";

/**
 * The two provider logos, drawn from each provider's published artwork.
 *
 * They live here because the app draws its own login buttons: the official
 * button components render at a fixed width and cannot be made to match each
 * other (see docs/decisions/mobile-authentication.md). Drawing the buttons
 * means the app owns the brand rules, so neither mark takes a colour prop that
 * would let a caller repaint it.
 */

const MARK_SIZE = 20;

/** Google's four-colour G. Its colours are fixed by Google's branding rules. */
export function GoogleMark() {
  return (
    <Svg height={MARK_SIZE} viewBox="0 0 48 48" width={MARK_SIZE}>
      <Path
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        fill="#EA4335"
      />
      <Path
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        fill="#4285F4"
      />
      <Path
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"
        fill="#FBBC05"
      />
      <Path
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        fill="#34A853"
      />
    </Svg>
  );
}

/**
 * Apple's mark. Apple allows it in black or white only, matched to the button
 * background, so the prop is that choice rather than a colour: a caller cannot
 * hand it the button's grey text colour by mistake.
 */
export function AppleMark({ tone }: { tone: "black" | "white" }) {
  const color = tone === "black" ? "#000000" : "#FFFFFF";

  return <AppleGlyph color={color} />;
}

function AppleGlyph({ color }: { color: string }) {
  return (
    <Svg height={MARK_SIZE} viewBox="0 0 24 24" width={MARK_SIZE}>
      <Path
        d="M17.05 12.54c-.02-2.4 1.96-3.55 2.05-3.61-1.12-1.63-2.86-1.86-3.48-1.89-1.48-.15-2.89.87-3.64.87-.75 0-1.91-.85-3.14-.83-1.61.02-3.1.94-3.93 2.38-1.68 2.91-.43 7.21 1.2 9.57.8 1.15 1.75 2.44 3 2.39 1.21-.05 1.67-.78 3.13-.78 1.46 0 1.87.78 3.14.76 1.3-.02 2.12-1.17 2.91-2.33.92-1.34 1.3-2.63 1.32-2.7-.03-.01-2.53-.97-2.56-3.83zM14.7 5.1c.66-.81 1.11-1.93.99-3.05-.95.04-2.11.64-2.8 1.44-.61.71-1.15 1.85-1.01 2.94 1.07.08 2.15-.54 2.82-1.33z"
        fill={color}
      />
    </Svg>
  );
}

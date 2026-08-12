import {
  type ImagePickerResult,
  launchCameraAsync,
  launchImageLibraryAsync,
  type MediaType,
  requestCameraPermissionsAsync,
} from "expo-image-picker";
import { useCallback, useState } from "react";

import type { ChosenPhoto } from "@/features/auth/api/avatar";

/** A photo the person chose, plus where to read it from until it is saved. */
export interface PhotoChoice {
  photo: ChosenPhoto;
  /** The local file, shown as the preview while the draft is unsaved. */
  uri: string;
}

/**
 * What both pickers ask the operating system for.
 *
 * `allowsEditing` with a square aspect is the picker's own crop step, not an
 * editor this app built: it is how the OS asks which part of a photo the person
 * means. It also keeps what gets uploaded to roughly avatar size, so a 12
 * megapixel photo does not travel whole to become a 96 point circle.
 *
 * `base64` because the bytes have to reach storage, and reading the file back
 * off disk afterwards would need another native module to do what the picker has
 * already done.
 */
const PICKER_OPTIONS = {
  allowsEditing: true,
  aspect: [1, 1] as [number, number],
  base64: true,
  mediaTypes: ["images"] as MediaType[],
  quality: 0.8,
};

const DEFAULT_MIME = "image/jpeg";

function toChoice(result: ImagePickerResult): PhotoChoice | undefined {
  const asset = result.canceled ? undefined : result.assets[0];

  if (!asset?.base64) {
    return;
  }

  return {
    photo: { base64: asset.base64, mimeType: asset.mimeType ?? DEFAULT_MIME },
    uri: asset.uri,
  };
}

export interface PhotoSource {
  /** True after the camera was refused, until another route succeeds. */
  isCameraDenied: boolean;
  pickFromLibrary: () => Promise<PhotoChoice | undefined>;
  takePhoto: () => Promise<PhotoChoice | undefined>;
}

/**
 * The two ways to get a new profile picture, and the one way they fail.
 *
 * A refused camera is not an error state for the screen — the person can still
 * choose from their library, and doing so clears the notice, because it stops
 * being useful the moment they have a photo. Allowing the camera later clears it
 * for the same reason.
 */
export function usePhotoSource(): PhotoSource {
  const [isCameraDenied, setIsCameraDenied] = useState(false);

  const takePhoto = useCallback(async () => {
    const permission = await requestCameraPermissionsAsync();

    if (!permission.granted) {
      setIsCameraDenied(true);

      return;
    }

    setIsCameraDenied(false);

    return toChoice(await launchCameraAsync(PICKER_OPTIONS));
  }, []);

  const pickFromLibrary = useCallback(async () => {
    setIsCameraDenied(false);

    return toChoice(await launchImageLibraryAsync(PICKER_OPTIONS));
  }, []);

  return { isCameraDenied, pickFromLibrary, takePhoto };
}

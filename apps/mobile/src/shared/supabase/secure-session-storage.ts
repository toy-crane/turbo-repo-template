import { gcm } from "@noble/ciphers/aes.js";
import { bytesToHex, hexToBytes } from "@noble/ciphers/utils.js";
import { getRandomBytes } from "expo-crypto";
import { deleteItemAsync, getItemAsync, setItemAsync } from "expo-secure-store";
import Storage from "expo-sqlite/kv-store";

const KEY_BYTES = 32;
const NONCE_BYTES = 12;

/**
 * SecureStore holds small values well but rejects large ones, and a Supabase
 * session is comfortably larger than its limit. So the encryption key lives in
 * SecureStore — the iOS keychain and the Android keystore — while the ciphertext
 * lives in the SQLite store beside the rest of the app's data.
 */
function keyAlias(name: string): string {
  // SecureStore keys allow only alphanumerics, ".", "-", and "_".
  return `supabase-session-key-${name.replace(/[^\w.-]/g, "_")}`;
}

async function encrypt(name: string, value: string): Promise<string> {
  const key = getRandomBytes(KEY_BYTES);
  const nonce = getRandomBytes(NONCE_BYTES);
  const ciphertext = gcm(key, nonce).encrypt(new TextEncoder().encode(value));

  await setItemAsync(keyAlias(name), bytesToHex(key));

  return `${bytesToHex(nonce)}.${bytesToHex(ciphertext)}`;
}

async function decrypt(name: string, stored: string): Promise<string | null> {
  const [nonceHex, ciphertextHex] = stored.split(".");
  const keyHex = await getItemAsync(keyAlias(name));

  if (!(keyHex && nonceHex && ciphertextHex)) {
    return null;
  }

  // A wrong or tampered value fails the GCM tag rather than decoding to
  // garbage. Treat that as "no session" so the app asks the user to sign in
  // again instead of crashing on unreadable state.
  try {
    const plaintext = gcm(hexToBytes(keyHex), hexToBytes(nonceHex)).decrypt(
      hexToBytes(ciphertextHex)
    );

    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

/**
 * Session storage that keeps the persisted Supabase session encrypted at rest.
 * Supabase awaits these methods, so returning promises is supported.
 */
export const secureSessionStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const stored = await Storage.getItem(key);

    return stored ? decrypt(key, stored) : null;
  },
  removeItem: async (key: string): Promise<void> => {
    await Storage.removeItem(key);
    await deleteItemAsync(keyAlias(key));
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await Storage.setItem(key, await encrypt(key, value));
  },
};

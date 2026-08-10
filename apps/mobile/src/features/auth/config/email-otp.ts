/**
 * Email one-time code settings.
 *
 * These describe server settings the app cannot read at runtime, so they are
 * duplicated here and have to be changed together with `supabase/config.toml`
 * (and with the Dashboard for a remote project).
 */

/** `[auth.email] otp_length`. */
export const OTP_LENGTH = 6;
/** `[auth.email] max_frequency`, in seconds. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** `[auth.email] otp_expiry`, in minutes. */
export const OTP_EXPIRY_MINUTES = 60;

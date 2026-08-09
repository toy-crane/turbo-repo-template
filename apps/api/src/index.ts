import { createApp } from "./app";

/**
 * The deployed server. Vercel and Bun both take a default export whose `fetch`
 * answers requests, which is what a Hono app already is.
 */
export default createApp();

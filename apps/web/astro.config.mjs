// @ts-check
import { defineConfig } from "astro/config";

// `static` is Astro's default, written out because it is a decision rather than
// a default here: this site is four documents and an email address, and the
// account deletion path a store reviewer opens must not depend on a running
// server. See docs/decisions/web-site-boundary.md.
export default defineConfig({
  build: {
    format: "file",
  },
  output: "static",
  trailingSlash: "never",
});

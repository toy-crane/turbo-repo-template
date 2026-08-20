import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  // Static output is Astro's default, so this site builds to plain files and
  // needs no adapter. That is what keeps the hosting target an open choice.
  //
  // The default `directory` build format is deliberate: it emits
  // `terms/index.html`, and serving a directory index is universal, so the
  // build opens on any static host. `format: "file"` was tried and rejected.
  // It emits `terms.html`, which only hosts that rewrite extensionless paths
  // resolve, and a plain file server then returns 404 for both `/terms` and
  // `/terms/`.
});

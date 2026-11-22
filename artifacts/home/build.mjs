import { build } from "esbuild";
import { rm } from "node:fs/promises";
await rm("dist", { recursive: true, force: true });
await build({
  entryPoints: ["src/index.ts"], bundle: true, platform: "node", format: "esm",
  outfile: "dist/index.mjs", logLevel: "info",
  banner: { js: "import { createRequire as __cr } from 'node:module'; const require = __cr(import.meta.url);" },
});

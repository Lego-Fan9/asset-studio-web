import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/AssetsManager.ts"],
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2023"
});
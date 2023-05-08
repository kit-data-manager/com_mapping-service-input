import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    // https://dzone.com/articles/what-is-a-source-map
    sourcemap: true,
    lib: {
      entry: resolve(__dirname, "src/main.ts"),
      name: "com_mapping-service-input",
      formats: ["es", "umd"],
      fileName: (format) => `com_mapping-service-input.${format}.js`,
    },
    rollupOptions: {},
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "browser-bundler",
  plugins: [react()],
  test: {
    setupFiles: ["./src/test/setup.ts"],
  },
});

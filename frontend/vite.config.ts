import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    // Reuse the persistent Docker database and the same demonstration credentials.
    proxy: { "/api": "http://127.0.0.1:8080" },
  },
});

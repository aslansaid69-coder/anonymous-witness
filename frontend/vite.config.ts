import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    strictPort: true,
    // Use the local School Edition API; its database and Blob storage remain hosted.
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});

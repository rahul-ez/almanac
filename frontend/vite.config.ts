import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy all /api calls to the local FastAPI backend during development.
      // This avoids CORS issues and matches the production setup where
      // FastAPI serves the built frontend as static assets on the same origin.
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});

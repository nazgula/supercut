import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/rpc": "http://localhost:3001",
      "/upload": "http://localhost:3001",
      "/uploads": "http://localhost:3001",
      "/renders": "http://localhost:3001",
      "/characters": "http://localhost:3001",
      "/faces": "http://localhost:3001",
      "/chat": "http://localhost:3001",
      "/health": "http://localhost:3001",
    },
  },
});

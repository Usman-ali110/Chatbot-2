import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// In development, /api requests are forwarded to the Node backend (npm start, port 3000)
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3000" }
  }
});

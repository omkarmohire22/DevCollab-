import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // exposes on 0.0.0.0 so others on same WiFi can access
    port: 5173,
  },
});

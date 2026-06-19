import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import process from "node:process";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendTarget = env.VITE_ESB_BACKEND_URL || "http://127.0.0.1:8000";

  return {
    plugins: [react(), tailwindcss()],
    server: {
      proxy: {
        "/api": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq, req) => {
              console.info(`[ESB proxy] ${req.method} ${req.url} -> ${backendTarget}${req.url}`);
              proxyReq.setHeader("x-esb-ui-proxy", "vite");
            });

            proxy.on("proxyRes", (proxyRes, req) => {
              console.info(`[ESB proxy] ${proxyRes.statusCode} ${req.method} ${req.url}`);
            });

            proxy.on("error", (error, req) => {
              console.error(`[ESB proxy] ERROR ${req.method} ${req.url}: ${error.message}`);
            });
          },
        },
        "/health": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
        "/metrics": {
          target: backendTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});

import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const port = Number(env.VITE_PORT) || 5173;
  const basePath = env.VITE_BASE_PATH || "/";
  const apiUrl = env.VITE_API_URL;

  if (!apiUrl && mode !== "production") {
    throw new Error("VITE_API_URL is not defined");
  } else if (!apiUrl) {
    console.warn(
      "WARNING: VITE_API_URL is not defined. Ensure it is set in Vercel.",
    );
  }

  return {
    base: basePath || "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
        "@assets": path.resolve(
          import.meta.dirname,
          "..",
          "..",
          "attached_assets",
        ),
      },
      dedupe: ["react", "react-dom"],
    },
    root: path.resolve(import.meta.dirname),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: "0.0.0.0",
      allowedHosts: true,
      fs: {
        strict: true,
      },
    },
    preview: {
      port: port,
      host: "0.0.0.0",
    },
  };
});

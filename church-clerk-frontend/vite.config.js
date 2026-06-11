import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const isProd = mode === "production";
  return {
    plugins: [react()],
    cacheDir: ".vite",
    define: {
      "import.meta.env.TEST_PUBLC_KEY": JSON.stringify(env.TEST_PUBLC_KEY || ""),
      "import.meta.env.TEST_PUBLIC_KEY": JSON.stringify(env.TEST_PUBLIC_KEY || "")
    },
    esbuild: {
      // Strip console.log and console.debug from production bundles
      drop: isProd ? ["debugger"] : [],
      pure: isProd ? ["console.log", "console.debug", "console.info"] : []
    }
  };
});

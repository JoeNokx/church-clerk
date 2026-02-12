import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    define: {
      "import.meta.env.TEST_PUBLC_KEY": JSON.stringify(env.TEST_PUBLC_KEY || ""),
      "import.meta.env.TEST_PUBLIC_KEY": JSON.stringify(env.TEST_PUBLIC_KEY || "")
    }
  };
});

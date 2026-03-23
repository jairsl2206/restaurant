import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from the root .env (parent of client/)
  const env = loadEnv(mode, '../', '')
  const apiPort = env.PORT || 3001

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': `http://localhost:${apiPort}`,
        '/uploads': `http://localhost:${apiPort}`,
      }
    }
  }
})

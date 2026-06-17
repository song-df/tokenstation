import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api/proxy': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/alipay': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/wechat': { target: 'http://localhost:8001', changeOrigin: true },
      '/api/student/site-config': { target: 'http://localhost:8001', changeOrigin: true },
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
})

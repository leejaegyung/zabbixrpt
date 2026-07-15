import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 개발 시 Vue → Laravel(/api) 프록시. 폐쇄망 빌드는 정적 산출물을 Laravel public에 배치.
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.LARAVEL_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.{test,spec}.js'],
    setupFiles: ['./tests/setup.js'],
  },
})

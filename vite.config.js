import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    // HMR 설정 - VS Code에서 수정 시 즉시 반영
    hmr: {
      overlay: true // 오류 오버레이 표시
    },
    // 파일 변경 감지 설정
    watch: {
      usePolling: true, // WSL에서 필요할 수 있음
      interval: 100
    },
    // 개발 서버 포트
    port: 5173,
    // 브라우저 자동 열기
    open: false
  },
  // CSS 처리 설정
  css: {
    postcss: './postcss.config.js'
  }
})

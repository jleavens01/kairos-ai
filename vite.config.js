import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import cesium from 'vite-plugin-cesium'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), cesium()],
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
    strictPort: true, // 포트가 사용 중이면 에러 발생 (다른 포트로 변경하지 않음)
    // 브라우저 자동 열기
    open: false
  },
  // CSS 처리 설정
  css: {
    postcss: './postcss.config.js'
  },
  // 빌드 최적화
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['@fal-ai/serverless-client']
  },
  // 메모리 최적화
  build: {
    sourcemap: false, // 개발 중에도 소스맵 비활성화로 메모리 절약
    chunkSizeWarningLimit: 1000
  }
})

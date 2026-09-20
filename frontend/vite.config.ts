/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 開発時は /api で始まる要求をバックエンド（Spring Boot）へ転送する。
    // ブラウザから見ると画面も API も同じオリジンになるため、CORS の設定が不要になる
    // （docs/frontend-design.md 9.）。
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    passWithNoTests: true, // テストがまだ無い段階でも npm test を成功させる
    css: false, // CSS Modules はクラス名だけあればよいので、テストでは CSS を処理しない
  },
});

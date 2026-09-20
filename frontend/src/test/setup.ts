// Vitest の全テストで共通の設定。vite.config.ts の test.setupFiles から読み込まれる。
// toBeInTheDocument() などの DOM 向けマッチャーを expect に追加する。
import '@testing-library/jest-dom/vitest';

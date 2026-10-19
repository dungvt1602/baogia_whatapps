import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/*
 * Unit test frontend (PLAN-0001 — mirror ago_frontend).
 *
 * Không dùng @vitejs/plugin-react: tsconfig đã đặt `jsx: "react-jsx"` nên bộ
 * biên dịch sẵn có của Vite hiểu JSX. Alias `@/` khai tay (khớp `paths` trong
 * tsconfig) thay cho vite-tsconfig-paths — bớt một dependency.
 *
 * Chỉ quét `src/**\/*.test.{ts,tsx}` — quy ước đặt test trong `__tests__/` cạnh
 * code (AGENTS.md — Testing Rule). Không bật `globals`: test import tường minh
 * từ "vitest".
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});

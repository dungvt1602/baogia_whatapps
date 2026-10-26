import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

/*
 * Chạy trước mỗi file test (vitest.config.mts → setupFiles).
 *
 * Dọn DOM sau mỗi test: không bật `globals` nên Testing Library không tự đăng
 * ký cleanup — thiếu bước này các test component sau sẽ thấy DOM của test trước.
 * Nếu jsdom thiếu API trình duyệt nào mà code gọi tới thì vá TỐI THIỂU ở đây
 * và ghi comment lý do.
 */
afterEach(() => {
  cleanup();
});

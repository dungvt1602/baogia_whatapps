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

/*
 * jsdom chưa cài window.scrollTo (chỉ in "Not implemented"). Trang công khai nhập giá cuộn lên
 * đầu sau khi gửi xong -> vá no-op để test không ồn.
 */
if (typeof window !== "undefined") window.scrollTo = () => {};

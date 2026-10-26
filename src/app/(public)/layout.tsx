import type { Metadata, Viewport } from "next";

/*
 * Layout riêng cho trang công khai (NCC mở từ tin Zalo): KHÔNG sidebar, KHÔNG AppChrome,
 * KHÔNG yêu cầu đăng nhập. Link có token nên cấm công cụ tìm kiếm lập chỉ mục.
 */
export const metadata: Metadata = {
  title: "Báo giá nhà cung cấp — Ago Group",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1F7440",
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[#F4F6F3]">{children}</div>;
}

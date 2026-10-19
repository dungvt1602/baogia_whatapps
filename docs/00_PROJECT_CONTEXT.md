# Ago Báo giá Frontend — Project Context

Ago Báo giá là công cụ nội bộ của Ago Group để:

- Quản lý **báo giá**, **template** tin nhắn (WhatsApp, có ảnh header) và **khách hàng**.
- **Gửi báo giá đa kênh** (WhatsApp / Zalo): xem trước → xác nhận → worker gửi nền → theo dõi tiến độ.
- **Nhận phản hồi khách** (webhook WhatsApp / Zalo) rồi báo về Zalo cho người phụ trách.
- Theo dõi hạn mức gửi của Meta, chất lượng số WhatsApp, nhật ký thao tác.

Đây KHÔNG phải ERP; là một ứng dụng nhỏ, một công ty, dùng nội bộ.

## Vai trò của repo này

Repo này là **frontend** (Next.js 16 App Router):

- Hiển thị giao diện, validate form, gọi API.
- **Không** có database, Prisma, worker hay webhook handler. Toàn bộ nghiệp vụ nằm ở backend NestJS riêng: `D:\project_ago_fruit\ago_bao_gia\baogia_be` (repo `ago_notification`).
- FE chỉ chuyển tiếp `/api/*` tới `BACKEND_URL` bằng proxy `src/app/api/[...path]/route.ts`.

Backend sở hữu: database (PostgreSQL/Prisma), worker gửi tin (đúng MỘT worker), webhook Meta/Zalo, OAuth + làm mới token Zalo, cron.

## Người dùng

- **admin**: thấy toàn bộ menu (Người dùng, Kênh gửi, Kênh nhận, Zalo OA, Log gửi, Phản hồi, Nhật ký).
- **staff**: Tổng quan, Khách hàng, Template, Gửi báo giá, cộng nút "Kích hoạt Zalo".

Đăng nhập kiểm ở phía client (session trong `localStorage`, key `ago_session`); danh tính người thao tác gửi lên backend qua header `x-actor-id` / `x-actor-name` (xem `docs/03_API_RULES.md`). Đây là giới hạn đã biết, không phải bảo mật thật.

## Triển khai

- `main` = production, chạy trên Render bằng Docker (`output: "standalone"`).
- Làm việc trên nhánh `dev`; CI chạy lint + test + build.
- Cần backend đang chạy và biến `BACKEND_URL` trỏ tới nó.

## Tài liệu liên quan

- `docs/01_ARCHITECTURE.md` — kiến trúc, luồng request, proxy, env.
- `docs/02_MODULE_MAP.md` — màn hình ↔ route ↔ endpoint backend.
- `docs/03_API_RULES.md` — quy ước API (lỗi, id, header, upload ảnh, redirect).
- `docs/zalo-oa.md` — hướng dẫn kết nối Zalo OA.
- Backend: `baogia_be/docs/06_FE_CONTRACT.md` (hợp đồng với FE).

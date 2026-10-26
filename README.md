# ago_baogia — Ago Báo giá (Frontend)

Giao diện web nội bộ của Ago Group để quản lý **báo giá, template, khách hàng** và **gửi báo giá đa kênh** (WhatsApp / Zalo), nhận phản hồi của khách rồi báo về Zalo cho người phụ trách.

Repo này chỉ là **frontend** Next.js. Toàn bộ nghiệp vụ, database, worker gửi tin, webhook Meta/Zalo nằm ở backend NestJS riêng (`baogia_be`, repo `ago_notification`). FE chuyển tiếp mọi `/api/*` tới backend qua proxy.

```text
Trình duyệt ──/api/*──▶ Next.js (proxy src/app/api/[...path]) ──BACKEND_URL──▶ Backend NestJS ──▶ PostgreSQL
```

> Đọc [`AGENTS.md`](AGENTS.md) trước khi sửa code: bản Next.js này có breaking changes so với kiến thức cũ, và file có các quy tắc của dự án.

## Công nghệ

Next.js 16 (App Router, `output: "standalone"`), React 19, TypeScript 5, Tailwind CSS 4, Zod 4, Sonner (toast), xlsx (import khách hàng), `@supabase/supabase-js` (chỉ Realtime màn Phản hồi), Vitest + Testing Library (test).

## Cấu trúc

```text
src/
├── app/            # routing + layout; api/[...path] là proxy sang backend
├── features/       # theo nghiệp vụ: auth, dashboard, quotes, customers, templates, send, ...
├── components/     # layout/ (sidebar, routes.ts), shared/ (UI dùng chung)
├── lib/            # api.ts, auth, countries, ... (có __tests__/)
└── test/           # setup cho Vitest
docs/               # tài liệu và plans/
```

Sơ đồ đầy đủ: [`docs/01_ARCHITECTURE.md`](docs/01_ARCHITECTURE.md).

## Chạy local

Cần Node.js >= 20 và **backend `baogia_be` đang chạy** (mặc định cổng 4000; xem README của backend).

```bash
npm install
cp .env.example .env     # điền BACKEND_URL (và các biến NEXT_PUBLIC_*)
npm run dev              # http://localhost:3000
```

Biến môi trường:

| Biến | Ý nghĩa |
|---|---|
| `BACKEND_URL` | URL backend NestJS, đích của proxy (vd. `http://localhost:4000`). Đọc lúc chạy. |
| `NEXT_PUBLIC_API_URL` | Để rỗng = same-origin qua proxy (chuẩn). |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Tuỳ chọn, chỉ để màn Phản hồi cập nhật realtime. |

Không commit `.env`. Mọi secret (Meta, Zalo, DB) thuộc về backend, FE không giữ.

## Lệnh

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Build production (không cần backend) |
| `npm start` | Chạy bản đã build |
| `npm run lint` | ESLint |
| `npm run test` | Unit test (Vitest) — chạy 1 lần |
| `npm run test:watch` | Vitest watch |

CI (`.github/workflows/ci.yml`) chạy `lint → test → build` trên push/PR vào `main` và `dev`.

## Tính năng chính

- Đăng nhập; menu theo vai trò: mọi người thấy Tổng quan, Khách hàng, Template, Gửi báo giá; **admin** thêm Người dùng, Kênh gửi, Kênh nhận, Zalo OA, Log gửi, Phản hồi, Nhật ký.
- Gửi báo giá: xem trước → xác nhận → theo dõi tiến độ, có cảnh báo hạn mức Meta.
- Quản lý khách hàng (lọc, import Excel, phân loại số di động/máy bàn), template WhatsApp có ảnh header.
- Nhận phản hồi khách và báo về Zalo; nút "Kích hoạt Zalo" (mã 6 số) cho người nhận.
- PWA cài được lên điện thoại.

Bản đồ màn hình ↔ route ↔ API: [`docs/02_MODULE_MAP.md`](docs/02_MODULE_MAP.md).

## Triển khai

- `main` = production trên Render, build bằng `Dockerfile` (standalone, cổng 3000). `dev` là nhánh làm việc.
- Đặt `BACKEND_URL` trỏ tới dịch vụ backend. Build không cần backend, nhưng chạy thì cần. `NEXT_PUBLIC_*` được nhúng lúc build.
- Webhook Meta/Zalo và OAuth callback Zalo phải trỏ tới domain đến được backend (qua proxy FE hoặc trực tiếp). Đặt `APP_BASE_URL` của backend = domain công khai của FE để OAuth quay về `/zalo-oa`.
- Chỉ chạy **một** worker gửi tin, ở backend.

```bash
docker compose up --build   # chạy FE; cần BACKEND_URL (mặc định http://localhost:4000)
```

## Giới hạn đã biết

- Đăng nhập chỉ kiểm ở client (session trong `localStorage`); header `x-actor-*` do client tự khai, chỉ phục vụ nhật ký.
- 3 route prototype `/bao-gia/tao`, `/bao-gia/mau`, `/bao-gia/chi-tiet` (`src/features/mock/`) còn dùng dữ liệu giả; các màn khác dùng API thật.

## Tài liệu

| File | Nội dung |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Quy tắc code cho dự án (kèm banner Next.js tự sinh) |
| [`PLANS.md`](PLANS.md) | Quy tắc lập kế hoạch; plan ở `docs/plans/` |
| [`docs/00_PROJECT_CONTEXT.md`](docs/00_PROJECT_CONTEXT.md) | Bối cảnh dự án |
| [`docs/01_ARCHITECTURE.md`](docs/01_ARCHITECTURE.md) | Kiến trúc, proxy, env |
| [`docs/02_MODULE_MAP.md`](docs/02_MODULE_MAP.md) | Màn hình ↔ route ↔ backend |
| [`docs/03_API_RULES.md`](docs/03_API_RULES.md) | Quy ước API |
| [`docs/zalo-oa.md`](docs/zalo-oa.md) | Kết nối Zalo OA từng bước |

# Ago Báo giá Frontend — Module Map

Bản đồ: màn hình FE → route (`src/components/layout/routes.ts`) → component → module/endpoint backend.
Controller backend: `baogia_be/src/modules/<module>/<module>.controller.ts` (mọi endpoint có tiền tố `/api`).

Vào `/` tự chuyển tới `/tong-quan`; chưa đăng nhập thì layout `(app)` đẩy ra `/login`. "Admin" = chỉ hiện menu với role admin.

## Screens

| Màn hình | Route | Key trong `routes.ts` | Component (`src/features/...`) | Backend module / endpoint chính |
|---|---|---|---|---|
| Đăng nhập | `/login` | — | `auth/components/login.tsx` | `auth`: `POST /api/auth/login` |
| Tổng quan | `/tong-quan` | `dash` | `dashboard/components/dashboard-screen.tsx` | `dashboard`: `GET /api/dashboard` |
| Danh sách báo giá | `/bao-gia` | `quotes` | `quotes/components/quotes-screen.tsx` | `quotations`: `GET/POST /api/quotations`, `GET/PATCH/DELETE /api/quotations/:id`, `GET/PUT /:id/items`; `templates`: `GET /api/templates` |
| Chi tiết báo giá | `/bao-gia/[id]` | `quotes` | `quotes/components/quotes-screen.tsx` | như trên + `GET/POST /api/quotations/:id/templates` |
| Khách hàng | `/khach-hang` | `customers` | `customers/components/customers-screen.tsx` (+ `schemas/customer-schema.ts`) | `customers`: `GET/POST /api/customers`, `PATCH/DELETE /:id`, `GET /markets`, `GET /search`, `POST /bulk-delete`, `POST /import` |
| Danh sách template | `/template` | `tpl` | `templates/components/templates-screen.tsx` | `templates`: `GET/POST /api/templates`, `GET/PATCH/DELETE /:id`, `POST /sync-meta`, `GET/POST/DELETE /:id/image`; `channels`: `GET /api/channels` |
| Chi tiết template | `/template/[id]` | `tpl` | `templates/components/templates-screen.tsx`, `template-quotation-card.tsx` | `templates`, `quotations` |
| Khách của template | `/template/[id]/khach-hang` | `tpl` | `templates/components/template-customers-screen.tsx` | `templates`: `GET/POST /:id/customers`, `POST /:id/customers/link`, `POST /:id/customers/unlink`, `POST/DELETE /:id/customers/:customerId`; `customers`: `/search`, `/markets` |
| Gửi báo giá | `/gui-bao-gia` | `send` | `send/components/send-flow.tsx` | `send`: `POST /api/send/preview`, `/confirm`, `/cancel`, `/process`, `GET /send/batches`, `GET /send/batches/:id` |
| Log gửi (admin) | `/log-gui` | `sendjobs` | `sendjobs/components/send-jobs-screen.tsx` | `send`: `GET /api/send-jobs` |
| Phản hồi (admin) | `/phan-hoi` | `inbox` | `inbox/components/inbox-screen.tsx` | `inbound`: `GET /api/inbound`; realtime Supabase (`lib/supabase.ts`, tuỳ chọn) |
| Kênh gửi (admin) | `/kenh-gui` | `channels` | `channels/components/channels-screen.tsx` | `channels`: `GET/POST /api/channels`, `PATCH/DELETE /:id` |
| Kênh nhận (admin) | `/kenh-nhan` | `receiveChannels` | `receive-channels/components/receive-channels-screen.tsx` | `receive-channels`: `GET/POST /api/receive-channels`, `PATCH/DELETE /:id` |
| Người dùng (admin) | `/nguoi-dung` | `team` | `users/components/users-screen.tsx` | `users`: `GET/POST /api/users`, `PATCH/DELETE /:id`, `GET/DELETE /:id/zalo`, `POST /:id/zalo/link-code` |
| Zalo OA (admin) | `/zalo-oa` | `zalo` | `zalo/components/zalo-screen.tsx` | `zalo`: `GET /status`, `POST /check`, `/disconnect`, `/refresh`, `/test`, `/oauth/start`, `/oauth/exchange`, `GET /senders`, `/shared-users`; `cron`: `/zalo-token`; `receive-channels` |
| Nhà cung cấp | `/nha-cung-cap` | `suppliers` | `suppliers/components/suppliers-screen.tsx` (+ `schemas/supplier-schema.ts`, `utils/supplier-payload.ts`) | `suppliers`: `GET/POST /api/suppliers`, `PATCH/DELETE /:id` |
| Báo giá NCC (danh sách + tạo) | `/bao-gia-ncc` | `rfqs` | `supplier-rfqs/components/rfq-list-screen.tsx`, `rfq-create-modal.tsx` | `supplier-rfqs`: `GET/POST /api/supplier-rfqs` |
| Chi tiết báo giá NCC | `/bao-gia-ncc/[id]` | `rfqs` | `supplier-rfqs/components/rfq-detail-screen.tsx` (+ `rfq-image-card`, `rfq-send-card`, `rfq-invitations-table`, `rfq-compare-panel`, `rfq-test-send-modal`) | `supplier-rfqs`: `GET/PATCH/DELETE /:id`, `PUT /:id/items`, `POST/DELETE/GET /:id/image`, `POST /:id/send`, `POST /:id/close`, `GET /test-recipients`, `POST /:id/test-send`, `GET /:id/compare`; `suppliers`: `GET /api/suppliers` |
| Trang công khai NCC nhập giá (không đăng nhập) | `/ncc/[token]` | — | `supplier-rfqs/public/public-quote-page.tsx` (+ `quote-form.ts`) | `GET /api/public/supplier-rfq/:token`, `POST /api/public/supplier-rfq/:token/quote` |
| Kích hoạt Zalo (modal ở sidebar) | — (mọi trang) | — | `zalo/components/zalo-activate-modal.tsx` | `users`: `/:id/zalo`, `/:id/zalo/link-code` |
| Nhật ký (admin) | `/nhat-ky` | `logs` | `logs/components/logs-screen.tsx` | `activity`: `GET /api/activity` |
| Tạo báo giá / Chọn mẫu / Chi tiết (prototype) | `/bao-gia/tao`, `/bao-gia/mau`, `/bao-gia/chi-tiet` | `new`, `template`, `detail` | `mock/components/*` | Chưa nối API (dữ liệu giả) |

## Backend endpoints không do FE gọi trực tiếp

Đi qua cùng proxy nhưng do hệ thống ngoài / lịch gọi:

| Module backend | Endpoint | Ai gọi |
|---|---|---|
| `webhooks` | `GET/POST /api/webhooks/whatsapp`, `GET/POST /api/webhooks/zalo` | Meta, Zalo |
| `zalo` | `GET /api/zalo/oauth/callback` | Zalo (redirect sau khi admin cấp quyền) |
| `cron` | `GET/POST /api/cron/process-sends`, `/zalo-token`, `/cleanup-logs` | pinger / lịch |
| `health` | `GET /api/health` | giám sát |

## Shared code dùng chung

| Thành phần | Vị trí |
|---|---|
| Gọi API, lỗi | `src/lib/api.ts`, `src/lib/api-error.ts` |
| Session, role | `src/lib/auth.tsx` |
| Danh sách route, menu | `src/components/layout/routes.ts`, `use-ago.ts` |
| Modal, hộp xác nhận, class form | `src/components/shared/modal.tsx` |
| Badge trạng thái | `src/components/shared/badge.tsx` |
| Gắn `x-actor-*` | `src/components/shared/actor-headers.tsx` |
| Chọn quốc gia / mã vùng | `src/components/shared/country-select.tsx`, `src/lib/countries.ts` |
| Nhãn loại số điện thoại | `src/lib/phone-type-meta.ts` |
| Nhãn nhật ký | `src/lib/activity-labels.ts` |

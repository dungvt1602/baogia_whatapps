# ago_baogia — Hệ thống quản lý báo giá nội bộ (Ago Group)

Ứng dụng **Next.js Fullstack** (frontend + backend chung một project): quản lý báo giá, template,
khách hàng và **gửi báo giá đa kênh** (WhatsApp / Zalo / Telegram), **nhận phản hồi khách** rồi
báo về Zalo cho người phụ trách.

Bản này là bước chuyển từ **Telegram bot + worker Go (`ago_order`)** sang web có database riêng,
nhưng vẫn **dùng chung Zalo OA với worker Go** khi cần (xem [Zalo OA](#zalo-oa)).

## Công nghệ

| Thành phần | Phiên bản / ghi chú |
|---|---|
| Next.js | **16.3.0** App Router (`output: "standalone"`) |
| React | 19.2.8 |
| TypeScript | 5 |
| Tailwind CSS | 4 (`@tailwindcss/postcss`) |
| Prisma | **7.9.1** + driver adapter `@prisma/adapter-pg` |
| Database | PostgreSQL (Supabase) |
| Supabase | `@supabase/supabase-js` — Realtime (màn Phản hồi) + Storage (ảnh template) |
| Zod | 4 — validate input ở API |
| Khác | `bcryptjs` (mật khẩu), `sonner` (toast), `xlsx` (import khách hàng), `libphonenumber-js/max` (phân loại số điện thoại) |

> ⚠️ **Đọc trước khi sửa code Next.js:** [`AGENTS.md`](AGENTS.md) — bản Next.js này có breaking
> changes so với kiến thức cũ; tra guide trong `node_modules/next/dist/docs/` trước khi viết.
> (`CLAUDE.md` chỉ trỏ về `AGENTS.md`.)

## Yêu cầu

- Node.js >= 20 (Docker dùng `node:22-alpine`)
- npm
- Một database PostgreSQL (Supabase hoặc Postgres local/Docker)

## Cài đặt & chạy

```bash
npm install        # cài dependencies + tự chạy `prisma generate` (postinstall)
cp .env.example .env   # rồi điền connection string + API key (xem mục Biến môi trường)
npm run db:push    # tạo bảng + áp schema (dự án không dùng lịch sử Prisma Migrate)
npm run dev        # http://localhost:3000
```

### Các lệnh

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Dev server (hot reload) |
| `npm run build` | Build production |
| `npm start` | Chạy bản production sau khi build |
| `npm run lint` | Kiểm tra ESLint |
| `npm run db:migrate` | Tạo & áp migration (khi sửa `schema.prisma`) |
| `npm run db:deploy` | Áp migration có sẵn (production) |
| `npm run db:push` | Đẩy nhanh schema vào DB, không tạo file migration |
| `npm run db:studio` | Mở Prisma Studio (GUI xem/sửa dữ liệu) |
| `npm run db:seed` | Chèn dữ liệu mẫu |
| `npm run db:generate` | Sinh lại Prisma Client |

> Dự án này **không có thư mục `prisma/migrations/`** (lịch sử Prisma Migrate) — schema được quản
> lý bằng `schema.sql` + `npm run db:push`. Vì vậy `db:migrate`/`db:deploy` (chạy `prisma migrate
> deploy`) **không có tác dụng**; dùng `db:push` để tạo/đồng bộ schema.
> Hoặc mở [`prisma/schema.sql`](prisma/schema.sql) dán vào **SQL Editor** của Supabase. Các thay đổi
> schema viết tay nằm ở [`prisma/migrations-manual/`](prisma/migrations-manual/).

## Cấu trúc thư mục

```
baogia_whatapps/
├── prisma/
│   ├── schema.prisma           # 23 model (nguồn chân lý của DB)
│   ├── schema.sql              # SQL thô sinh từ schema (dán tay vào Supabase)
│   ├── seed.ts                 # Dữ liệu mẫu
│   ├── backfill-phone-type.ts  # Gắn nhãn loại số 1 lần cho khách hiện có (dry-run mặc định)
│   └── migrations-manual/      # Migration viết tay (N-N template<->customer; cột phone_type + index)
├── scripts/
│   └── smoke-pure.ts           # Test runtime các hàm thuần (npx tsx scripts/smoke-pure.ts)
├── src/
│   ├── app/
│   │   ├── layout.tsx          # Layout gốc: font, AuthProvider, Toaster, PWA, ActorHeaders
│   │   ├── page.tsx            # "/" -> redirect /tong-quan
│   │   ├── (auth)/login/       # Nhóm route chưa đăng nhập
│   │   ├── (app)/              # Nhóm route đã đăng nhập — có sidebar/topbar dùng chung
│   │   │   ├── layout.tsx      #   Chặn khi chưa có session (client) + bọc AgoProvider/AppChrome
│   │   │   └── <màn>/page.tsx  #   Mỗi thư mục = 1 URL (xem bảng Màn hình)
│   │   └── api/                # BACKEND — 54 route handler
│   ├── components/
│   │   ├── common/             # api.ts (helper fetch), ui.tsx, ActorHeaders, RegisterSW, phoneTypeMeta...
│   │   └── layout/             # AppChrome (sidebar+topbar), useAgo, routes.ts, state.ts
│   ├── features/               # Giao diện theo màn (mỗi màn 1 thư mục)
│   │   ├── mock/               #   ⚠️ Prototype còn sót (xem Ghi chú)
│   │   └── ...
│   ├── lib/auth.tsx            # Session phía client (localStorage)
│   ├── server/                 # TẦNG SERVER-ONLY (mọi file có `import "server-only"`)
│   │   ├── db/prisma.ts        #   Prisma Client singleton + driver adapter
│   │   ├── http/               #   json.ts (BigInt->string, bọc lỗi zod), baseUrl.ts
│   │   ├── lib/                #   whatsapp, zalo, zaloSharedToken, telegram, storage, placeholders, password, phoneType, quotaTier
│   │   ├── services/           #   Nghiệp vụ (18 file, thêm quotaService)
│   │   └── validation/         #   Schema zod dùng chung FE/BE
│   └── instrumentation.ts      # Worker nền (gửi, dọn log, làm mới token Zalo)
├── public/                     # Logo, font, manifest PWA, sw.js, file xác thực domain Zalo
├── Dockerfile                  # Multi-stage: deps -> builder -> runner (standalone)
├── docker-compose.yml          # Service app / migrate / db (Postgres local)
├── prisma.config.ts            # Cấu hình Prisma CLI (Prisma 7 đọc DIRECT_URL)
└── .env.example                # Mẫu đầy đủ các biến môi trường
```

### Kiến trúc 3 tầng

```
src/features/*          ← Giao diện, gọi API qua src/components/common/api.ts
        │  fetch /api/*
        ▼
src/app/api/*/route.ts  ← Mỏng: parse zod + gọi service + trả JSON (handle/json)
        │
        ▼
src/server/services/*   ← Nghiệp vụ + Prisma; src/server/lib/* gọi API ngoài (Meta, Zalo, Telegram)
```

- **`page.tsx`** → giao diện (frontend). **`route.ts`** → API (backend), export `GET`/`POST`/`PATCH`/`DELETE`.
- `src/server/**` có `import "server-only"` → không bao giờ lọt vào bundle client (an toàn cho API key).
- Mọi response đi qua `json()` trong [`src/server/http/json.ts`](src/server/http/json.ts) để
  **chuyển BigInt → string** (khoá chính của Prisma là `BigInt`, `JSON.stringify` thuần sẽ ném lỗi).

## Màn hình (routes)

Vào `/` tự chuyển tới `/tong-quan`; chưa đăng nhập thì layout `(app)` đẩy ra `/login`.

| URL | Màn | Component | Ghi chú |
|---|---|---|---|
| `/login` | Đăng nhập | `features/auth/Login.tsx` | |
| `/tong-quan` | Tổng quan | `features/dashboard/DashboardScreen.tsx` | Số liệu + thẻ chất lượng số & hạn mức |
| `/bao-gia` | Danh sách báo giá | `features/quotes/QuotesScreen.tsx` | |
| `/bao-gia/[id]` | Chi tiết báo giá | `features/quotes/QuotesScreen.tsx` | `id` lấy từ URL |
| `/khach-hang` | Khách hàng | `features/customers/CustomersScreen.tsx` | Lọc/tìm/import + cột & bộ lọc **Loại số** |
| `/template` | Danh sách template | `features/templates/TemplatesScreen.tsx` | |
| `/template/[id]` | Chi tiết template | `features/templates/TemplatesScreen.tsx` | |
| `/template/[id]/khach-hang` | Khách của template | `features/templates/TemplateCustomersScreen.tsx` | Gắn/gỡ N–N + lọc loại số |
| `/gui-bao-gia` | Gửi báo giá | `features/send/SendFlow.tsx` | Preview → xác nhận → tiến độ + cảnh báo hạn mức |
| `/kenh-gui` | Kênh gửi | `features/channels/ChannelsScreen.tsx` | Admin |
| `/kenh-nhan` | Kênh nhận | `features/receive-channels/ReceiveChannelsScreen.tsx` | Admin |
| `/nguoi-dung` | Người dùng | `features/users/UsersScreen.tsx` | Admin; cột Zalo để kích hoạt |
| `/zalo-oa` | Zalo OA | `features/zalo/ZaloScreen.tsx` | Admin; kết nối, token, webhook, gửi thử |
| `/log-gui` | Log gửi | `features/sendjobs/SendJobsScreen.tsx` | Admin |
| `/phan-hoi` | Phản hồi | `features/inbox/InboxScreen.tsx` | Admin; realtime qua Supabase |
| `/nhat-ky` | Nhật ký | `features/logs/LogsScreen.tsx` | Admin |
| `/bao-gia/tao`, `/bao-gia/mau`, `/bao-gia/chi-tiet` | — | `features/mock/Screens.tsx` | ⚠️ Còn dùng dữ liệu giả (xem Ghi chú) |

Menu sidebar (`src/components/layout/useAgo.ts`): **Tổng quan, Khách hàng, Template, Gửi báo giá**
cho mọi người; **Người dùng, Kênh gửi, Kênh nhận, Zalo OA, Log gửi, Phản hồi, Nhật ký** chỉ hiện
với role `admin`.

Nút **Ⓩ Kích hoạt Zalo** nằm dưới tên người dùng ở sidebar — ai cũng có (xem
[Kích hoạt Zalo](#kích-hoạt-zalo-cho-người-nhận)).

## API

Tất cả nằm trong `src/app/api/`. Không có `middleware.ts` — xem mục
[Bảo mật](#bảo-mật--giới-hạn-cần-biết).

### Nghiệp vụ

| Endpoint | Method | Việc |
|---|---|---|
| `/api/auth/login` | POST | Đăng nhập (username **hoặc** email), verify bcrypt, trả `{id, username, isAdmin, roleLabel}` |
| `/api/users` | GET, POST | Liệt kê / tạo người dùng |
| `/api/users/[id]` | PATCH, DELETE | Sửa / xoá người dùng |
| `/api/users/[id]/zalo` | GET, DELETE | Trạng thái kích hoạt Zalo / huỷ liên kết |
| `/api/users/[id]/zalo/link-code` | POST | Cấp mã 6 số kích hoạt Zalo (sống 10 phút) |
| `/api/customers` | GET, POST | Danh sách (lọc `market`, `search`, `sort`, `excludeTemplate`) / tạo khách |
| `/api/customers/[id]` | PATCH, DELETE | Sửa / xoá khách |
| `/api/customers/search` | GET | Phân trang + tìm kiếm (`?idsOnly=1` để lấy id cho "chọn tất cả") |
| `/api/customers/markets` | GET | Danh sách quốc gia cho dropdown lọc |
| `/api/customers/import` | POST | Import hàng loạt (từ Excel đã map ở client) |
| `/api/customers/bulk-delete` | POST | Xoá hàng loạt theo `{ids: []}` |
| `/api/quotations` | GET, POST | Danh sách / tạo báo giá |
| `/api/quotations/[id]` | GET, PATCH, DELETE | Chi tiết (kèm items) / sửa / xoá |
| `/api/quotations/[id]/items` | GET, PUT | Mặt hàng — PUT **ghi đè toàn bộ** rồi tính lại `totalAmount` |
| `/api/quotations/[id]/templates` | GET, POST | Template thuộc báo giá / tạo mới trong báo giá |
| `/api/templates` | GET, POST | Danh sách (`?pool` = kho, `?page`/`?search` = phân trang) / tạo |
| `/api/templates/[id]` | GET, PATCH, DELETE | Chi tiết / sửa / xoá |
| `/api/templates/[id]/image` | GET, POST, DELETE | Ảnh header — GET redirect sang Storage, POST nhận bytes (≤ 5MB, `image/*`) |
| `/api/templates/[id]/customers` | GET, POST | Khách của template / tạo khách gắn thẳng vào template |
| `/api/templates/[id]/customers/[customerId]` | POST, DELETE | Gắn / gỡ 1 khách |
| `/api/templates/[id]/customers/link` \| `/unlink` | POST | Gắn / gỡ hàng loạt |
| `/api/templates/sync-meta` | POST | Đồng bộ template đã duyệt từ Meta (tự set cờ nút Flow / ảnh header) |
| `/api/channels`, `/api/channels/[id]` | GET, POST, PATCH, DELETE | CRUD kênh gửi — **chỉ trả `api_key_env`, không bao giờ trả key thật** |
| `/api/receive-channels`, `/api/receive-channels/[id]` | GET, POST, PATCH, DELETE | CRUD kênh nhận (cùng nguyên tắc trên) |
| `/api/send/preview` | POST | Tạo batch `PREVIEW` + render tin mẫu + danh sách khách đủ điều kiện |
| `/api/send/confirm` | POST | Chốt lệnh: tạo `send_jobs` (`QUEUED`), batch → `QUEUED` |
| `/api/send/cancel` | POST | Huỷ lệnh → `CANCELLED` |
| `/api/send/process` | POST | Chạy 1 lượt worker gửi |
| `/api/send/batches`, `/api/send/batches/[id]` | GET | Danh sách / chi tiết lệnh gửi (UI poll 2s để xem tiến độ) |
| `/api/send-jobs` | GET | Log gửi từng khách |
| `/api/inbound` | GET | Phản hồi của khách |
| `/api/activity` | GET | Nhật ký hoạt động |
| `/api/dashboard` | GET | Số liệu tổng quan |

### Zalo OA

| Endpoint | Method | Việc |
|---|---|---|
| `/api/zalo/status` | GET | Trạng thái kết nối + `callbackUrl`/`webhookUrl` (không trả token) |
| `/api/zalo/oauth/start` | POST | Sinh PKCE (`code_verifier` lưu DB) + trả URL cấp quyền |
| `/api/zalo/oauth/callback` | GET | Zalo redirect về → đổi `code` lấy token → về `/zalo-oa?zalo=ok` |
| `/api/zalo/oauth/exchange` | POST | Đường tay: dán nguyên link callback (hoặc `code`) để đổi token |
| `/api/zalo/refresh` | POST | Ép làm mới access token ngay |
| `/api/zalo/check` | POST | Gọi Zalo thật kiểm tra kết nối (không gửi tin) |
| `/api/zalo/test` | POST | Gửi thử 1 tin text |
| `/api/zalo/disconnect` | POST | Xoá token khỏi DB |
| `/api/zalo/senders` | GET | Người đã nhắn/quan tâm OA (để thêm nhanh làm kênh nhận) |
| `/api/zalo/shared-users` | GET | Người đã liên kết Zalo **bên worker Go** (chế độ dùng chung token) |

### Webhook & cron

| Endpoint | Method | Việc | Chữ ký | Luôn 200? |
|---|---|---|---|---|
| `/api/webhooks/whatsapp` | GET | Verify với Meta (`hub.verify_token` = `WHATSAPP_VERIFY_TOKEN`) | verify token | Không — sai thì **403** |
| `/api/webhooks/whatsapp` | POST | Nhận status (sent/delivered/read/failed) + tin khách trả lời → lưu DB, báo sếp, auto-reply | ⚠️ **không kiểm chữ ký** | Có |
| `/api/webhooks/zalo` | GET | Kiểm tra endpoint sống | — | Có |
| `/api/webhooks/zalo` | POST | Chuyển tiếp raw sang worker Go → xử lý mã kích hoạt → lưu phản hồi → báo sếp | `X-ZEvent-Signature` (SHA256) | Có (cố ý — Zalo từ chối lưu URL nếu không 200) |
| `/api/cron/process-sends` | GET, POST | Vòng lặp gửi kiểu **kéo**, tối đa ~40s/lần; tiện thể làm mới token Zalo | — | |
| `/api/cron/zalo-token` | GET, POST | Làm mới token Zalo OA | — | |
| `/api/cron/cleanup-logs` | GET, POST | Xoá log > 3 ngày | — | |
| `/api/health` | GET, HEAD | Ping nhẹ giữ Render không ngủ (**cố ý không đụng DB**) | — | |
| `/api/hello` | GET, POST | Demo | — | |

## Database

PostgreSQL qua Prisma 7. Khoá chính là **`BigInt`** → API phải chuyển sang string
(đã xử lý sẵn trong `src/server/http/json.ts`).

### Lấy connection string từ Supabase

Supabase Dashboard → **Connect** → **ORMs** → **Prisma**, copy 2 URL:

- `DATABASE_URL`: **Transaction pooler** (port `6543`, có `?pgbouncer=true`) — runtime dùng.
- `DIRECT_URL`: **Direct connection** (port `5432`) — Prisma CLI dùng khi migrate.

Prisma 7 không tự đọc `.env` → [`prisma.config.ts`](prisma.config.ts) nạp `dotenv/config` và
trỏ datasource vào `DIRECT_URL`.

### Các bảng

| Nhóm | Bảng |
|---|---|
| Người dùng & phân quyền | `users`, `roles`, `user_roles` (N–N) |
| Báo giá | `quotations`, `quotation_items`, `user_quotations` (N–N) |
| Template | `templates`, `template_images` (1–1, ảnh header), `categories`, `quotation_template_sends` (legacy) |
| Khách hàng | `customers`, `template_customers` (**N–N** với template), `audit_logs` (1–1 với customer) |
| Gửi báo giá | `send_batches` (lệnh gửi), `send_jobs` (hàng đợi từng khách) |
| Nhận phản hồi | `receive_channels`, `inbound_messages`, `app_settings` (key-value) |
| Zalo OA | `zalo_oa_tokens`, `zalo_user_bindings`, `zalo_link_requests` |
| Log | `activity_logs` |

Quan hệ chính: `user ↔ role` (N–N, `user_roles`) · `user ↔ quotation` (N–N, `user_quotations`) ·
`quotation → template` (1–N) · `quotation → quotation_items` (1–N) · `template ↔ customer` (N–N,
`template_customers`) · `template → send_batch` (1–N) · `send_batch → send_job` (1–N) ·
`receive_channel → inbound_message` (1–N).

Index đã thêm cho các màn nặng: `customers(market, name, phone_type)`,
`templates(quotation_id, created_at)`, `send_jobs(status, batch_id, created_at, message_id, status+sent_at)`,
`inbound_messages(received_at, customer_id, receive_channel_id)`.

`customers` có thêm 2 cột: `phone_type` (loại số: MOBILE/FIXED_LINE/AMBIGUOUS/UNKNOWN — suy từ dãy số)
và `wa_status` (NO_WHATSAPP — suy từ kết quả gửi thật, tín hiệu yếu).

## Bảo mật API key

**DB không bao giờ lưu API key thật.** Cột `api_key_env` chỉ lưu **TÊN biến môi trường**:

```
DB: channels.api_key_env = "TELEGRAM_BOT_TOKEN_MAIN"
                │
                ▼
      process.env["TELEGRAM_BOT_TOKEN_MAIN"]   ←  key thật ở .env
```

```ts
import { getChannelApiKey } from "@/server/services/channelService";

const token = getChannelApiKey(channel); // đọc process.env, KHÔNG đọc từ DB
```

Nguyên tắc này áp cho cả `channels` (kênh gửi) và `receive_channels` (kênh nhận). Helper có
`import "server-only"` nên không thể lọt ra client; `GET /api/channels` cũng chỉ trả tên biến.

> **Ngoại lệ có chủ đích — `zalo_oa_tokens`:** bảng này lưu token **thật**, vì token Zalo xoay
> vòng (access ~1–25 giờ, refresh ~3 tháng, mỗi lần làm mới Zalo cấp refresh_token mới và vô hiệu
> cái cũ) nên không thể đặt cố định trong `.env`. Xem [Zalo OA](#zalo-oa).

## Luồng nghiệp vụ

### 1. Gửi báo giá

**Báo giá → Template → Khách.** Chọn 1 template = gửi cho toàn bộ khách đã gắn với template đó.

```
POST /api/send/preview   →  batch PREVIEW   (render tin mẫu, liệt kê khách đủ điều kiện)
POST /api/send/confirm   →  batch QUEUED    (mỗi khách 1 send_job QUEUED, nội dung render sẵn)
        ↓ worker
      SENDING → SENT | PARTIAL_FAILED        (batch CANCELLED nếu người dùng huỷ)
```

- **Khách đủ điều kiện** = `status = ACTIVE` **và** `receiveQuotation = true`.
- **Mã lệnh**: `BG` + `YYYYMMDDHHMMSS` (giờ VN).
- **Worker** nhặt job `QUEUED` hoặc `FAILED` có `retryCount < 3`, mỗi tin cách nhau 1 giây.
  Lỗi tạm thời → trả job về `QUEUED` để lượt sau gửi lại; **lỗi vĩnh viễn** (mã Meta
  `131049`, `131026`, `131047`, `132xxx`, `(#100)`, thiếu `parameter_name`…) → đánh `FAILED`
  và đẩy `retryCount` lên trần ngay để không thử lại.
- **Trạng thái job**: `QUEUED → SENDING → SENT → DELIVERED → READ`, hoặc `FAILED`, hoặc
  **`HOLD`** (chờ hạn mức — xem [Hạn mức gửi Meta](#2-hạn-mức-gửi-meta)).
- **Trạng thái cuối batch**: còn job chưa xong (gồm cả `HOLD`) → `QUEUED`; có job `FAILED` →
  `PARTIAL_FAILED`; tất cả `SENT` → `SENT`.
- UI (`SendFlow.tsx`) poll `GET /api/send/batches/{id}` mỗi **2 giây** để hiện tiến độ.
- **Huỷ lệnh** (`cancelSend`) cũng huỷ luôn job `QUEUED`/`HOLD` → `FAILED` (không đụng `SENDING`).

#### Template Meta vs. text thường

| | Template Meta | Text thường |
|---|---|---|
| Khi nào | Kênh WHATSAPP **và** template có `waTemplateName` **và** `sendAsText = false` | Còn lại |
| Ảnh | Header component `image.id` (upload **1 lần/lệnh**, lưu vào `send_batches.media_id`) | **Không gửi ảnh** |
| Biến | `waBodyParams`: `customer_name={khách hàng}` → biến **có tên**; `{khách hàng}, {mã}` → biến **vị trí** | `renderTemplate` thay `{...}` trong `body` |
| Nút Flow | Component `button` `sub_type: "flow"`, `flow_token = AGO_<sđt>_<uuid>` | Không |
| Gửi được khi nào | Chủ động, ngoài cửa sổ 24h | Chỉ trong cửa sổ 24h |

Biến trong template (`src/server/lib/placeholders.ts`): `{khách hàng}`, `{mã}`, `{tiêu đề}`,
`{giá}`, `{tổng}`, `{thị trường}`, `{ngày gửi}`, `{hiệu lực}`, `{bảng sản phẩm}`, `{số mặt hàng}`.
Biến không nhận ra thì **giữ nguyên**, không bị xoá.

### 2. Hạn mức gửi Meta

Meta giới hạn số **khách DUY NHẤT** một số điện thoại/business portfolio được chủ động nhắn
trong **24h cuốn** (từ 07/10/2025 là cấp **portfolio**, dùng chung mọi số). Meta **không có API
đọc "đã dùng bao nhiêu"**, nên app **tự đếm** (`src/server/services/quotaService.ts`).

- App chỉ đếm được tin **do app gửi** — mù với bot Go / WhatsApp Manager → có `QUOTA_SAFETY_RATIO`
  chừa khoảng trống an toàn (mặc định dùng tối đa 90% hạn mức).
- Khi hết hạn mức, worker **không chặn tạo lệnh** mà chuyển job còn lại sang trạng thái **`HOLD`**
  ("Chờ hạn mức" ở Log gửi), rồi tự nhả lại khi có chỗ (theo FIFO).
- Màn xem trước báo: *"Hạn mức còn X khách hôm nay · Lệnh này N khách, dự kiến gửi xong sau ~D ngày"*.
- Lưu ý: job `HOLD` **không bị dọn log xoá** (hàm dọn chỉ xoá job đã kết thúc — xem [Job nền](#job-nền--cron)).

### 3. Chất lượng số WhatsApp (Tổng quan)

`GET /{phone_number_id}` trả `quality_rating` (GREEN/YELLOW/RED/**NA**), `messaging_limit_tier`,
`status`… — cache 10 phút (`metaSyncService.getPhoneNumberHealth`). Màn **Tổng quan** có thẻ
"Chất lượng số & hạn mức"; khi chất lượng **vàng/đỏ** hiện dải cảnh báo ở Tổng quan và màn
Gửi báo giá. Thiếu cấu hình Meta thì hiển thị fallback "hạn mức không xác định".

### 4. Loại số điện thoại (Di động / Máy bàn)

Mỗi khách có cột **`phone_type`** suy từ dãy số bằng `libphonenumber-js/max`
(`src/server/lib/phoneType.ts`), gắn tự động khi thêm/sửa/import + backfill 1 lần cho khách cũ:

| Giá trị | Ý nghĩa |
|---|---|
| `MOBILE` | Di động |
| `FIXED_LINE` | Máy bàn |
| `AMBIGUOUS` | **Không phân biệt được** (Mỹ/Canada/một phần châu Âu — giới hạn của hệ thống số) |
| `UNKNOWN` | Không xác định |

Màn Khách hàng và màn "Thêm khách vào template" có cột nhãn + bộ lọc **Loại số** + checkbox
"Chỉ khách có số WhatsApp". Màn xem trước báo "trong N khách có X số máy bàn".

Ngoài ra còn cột **`wa_status`** = `NO_WHATSAPP`, suy từ lỗi gửi `131026` — **tín hiệu yếu**
(131026 còn do chưa nhận ToS / app cũ / frequency capping), chỉ cảnh báo trên UI, **không tự
loại khách**; người dùng sửa tay được.

### 5. Nhận phản hồi khách

```
Meta/Zalo gọi webhook
   → lưu inbound_messages (chống trùng theo waMessageId)
   → khớp customer theo SĐT (so 9 số cuối của whatsappPhone/phone; chỉ áp dụng cho WHATSAPP)
   → Supabase Realtime đẩy INSERT sang màn Phản hồi
   → notifyInboundReply: gửi tin báo cho mọi receive_channel đang bật (TELEGRAM/ZALO)
   → maybeAutoReply: gửi template trả lời tự động (nếu có mẫu bật autoReply)
```

- Tin báo cho sếp gồm 4 dòng (Tên–SĐT / CTY–QG / Type / Reply); khách bấm nút Flow thì
  `formatFlowReply` bóc JSON ra sản phẩm, số lượng, container, cảng đến, ghi chú.
- Zalo không có SĐT → `inbound_messages.from_phone` lưu **user_id (UID)**, `customerId` để trống.
- **Auto-reply** chỉ chạy với WhatsApp, có cooldown `AUTO_REPLY_COOLDOWN_MIN` (mặc định **60 phút**),
  cache `media_id` trong 25 ngày. Chỉ nên bật **1 mẫu** — bật mẫu mới sẽ tự tắt mẫu cũ.

### 6. Zalo OA

Toàn bộ quy trình (PKCE, làm mới token, webhook, các bẫy đã gặp thật) nằm ở
**[`docs/zalo-oa.md`](docs/zalo-oa.md)**. Tóm tắt:

- Token sống ngắn nên app **tự làm mới**: job 5 phút/lần + làm mới "lười" ngay lúc gửi tin +
  `/api/cron/zalo-token`. Gặp lỗi `-216` thì làm mới rồi gửi lại **1 lần**.
- Kết nối lần đầu ngay trong app: màn **Zalo OA** → *Kết nối Zalo OA* → admin OA bấm Đồng ý
  (không phải chạy `openssl`/`curl` tay như bản worker Go).
- **Dùng chung token với worker Go:** đặt `ZALO_TOKEN_SOURCE_DB_URL` = connection string DB của
  Go → web chỉ **đọc** token (Go vẫn là bên duy nhất xoay refresh_token, không tranh chấp).
- Webhook Zalo **luôn trả 200** (kể cả chữ ký sai) vì Zalo từ chối lưu URL nếu không phải 200;
  chữ ký sai thì chỉ log, **không xử lý gì**.
- Bẫy hay gặp: `ZALO_WEBHOOK_SECRET` (ô Secret Key trong trang Webhook) **khác** `ZALO_SECRET_KEY`
  (Secret Key của app). Nhầm 2 cái = mọi webhook bị coi là sai chữ ký, im lặng không báo lỗi.

### 7. Kích hoạt Zalo cho người nhận

Zalo chỉ cho OA nhắn người **đã tương tác** với OA, và cần `user_id` theo OA (không phải SĐT):

1. Bấm **Ⓩ Kích hoạt Zalo** (sidebar) hoặc admin vào **Người dùng → cột Zalo → Lấy mã kích hoạt**.
2. App cấp **mã 6 số** (sống 10 phút, bảng `zalo_link_requests`).
3. Người đó mở Zalo, tìm OA và **nhắn đúng mã** (chưa từng chat thì bấm Quan tâm).
4. Webhook nhận mã → gắn `user_id` với tài khoản (`zalo_user_bindings`) và **tự tạo kênh nhận ZALO**
   (`receive_channels`, tên `"Zalo — <họ tên>"`), OA trả lời xác nhận.
5. Từ đó mọi phản hồi khách (WhatsApp **và** Zalo) tự bay về Zalo người đó.

Huỷ kích hoạt sẽ xoá cả binding lẫn kênh nhận. Tin của nhân viên đã kích hoạt nhắn vào OA
**không** bị coi là phản hồi khách.

## Job nền & cron

[`src/instrumentation.ts`](src/instrumentation.ts) được Next.js gọi **1 lần khi server khởi động**
(runtime nodejs). Ba việc chạy song song:

| Việc | Chu kỳ | Tắt bằng |
|---|---|---|
| Gửi báo giá (`processNextBatch`) | `SEND_WORKER_POLL_MS` (mặc định **8s**) | `SEND_WORKER_DISABLED=true` |
| Dọn log > 3 ngày (chỉ job **đã kết thúc**; job chờ/hold > 30 ngày → FAILED có lý do) | **10 phút** | — |
| Làm mới token Zalo OA | **5 phút** | — |

Vì Render free cho server ngủ, ngoài `setInterval` còn có đường **kéo** (pinger gọi
`/api/cron/*` mỗi phút) để app tự hồi khi thức dậy.

## Biến môi trường

Xem mẫu đầy đủ ở [`.env.example`](.env.example). **`.env` không bao giờ được commit.**

### Bắt buộc

| Biến | Ý nghĩa |
|---|---|
| `DATABASE_URL` | Postgres pooler (6543, `?pgbouncer=true`) — runtime |
| `DIRECT_URL` | Postgres direct (5432) — Prisma CLI migrate |

### Kênh gửi / gửi thật

| Biến | Ý nghĩa |
|---|---|
| `WHATSAPP_TOKEN_MAIN` | Token WhatsApp Cloud API (tên biến phải khớp `channels.api_key_env`) |
| `WHATSAPP_PHONE_NUMBER_ID` | Phone number id gửi tin |
| `WHATSAPP_API_VERSION` | Mặc định `v22.0` |
| `TELEGRAM_BOT_TOKEN_MAIN` | Token bot Telegram |
| `ZALO_OA_TOKEN_MAIN` | Token Zalo **tĩnh** — chỉ là fallback khi chưa kết nối OA ở màn Zalo OA |
| `SEND_DRY_RUN` | **Mặc định là GIẢ LẬP — không gọi API thật.** Chỉ `false` / `0` / `no` / `off` (không phân biệt hoa thường, tự bỏ khoảng trắng thừa) mới gửi thật; mọi giá trị khác đều là giả lập |
| `SEND_WORKER_POLL_MS` / `SEND_WORKER_DISABLED` | Chu kỳ / tắt worker gửi |
| `QUOTA_SAFETY_RATIO` | Tỷ lệ hạn mức Meta được phép dùng (chừa an toàn, mặc định `0.9` = 1800/2000) |

### Webhook

| Biến | Ý nghĩa |
|---|---|
| `WHATSAPP_VERIFY_TOKEN` | Chuỗi tự đặt, khai y hệt trong Meta để verify webhook |
| `WHATSAPP_WABA_ID` | WABA id (bỏ trống thì app tự dò / tự bắt từ webhook) |
| `ZALO_WEBHOOK_SECRET` | Secret ký webhook — **khác** `ZALO_SECRET_KEY`. Bỏ trống = **không kiểm chữ ký** (chỉ dùng khi dev) |

### Zalo OA

| Biến | Ý nghĩa |
|---|---|
| `ZALO_APP_ID` / `ZALO_SECRET_KEY` | Danh tính app trên developers.zalo.me |
| `ZALO_OA_ID` | Bỏ trống được — app tự bắt từ callback/webhook |
| `ZALO_OAUTH_CALLBACK_URL` | Bỏ trống = `https://<domain>/api/zalo/oauth/callback` |
| `ZALO_BOSS_USER_ID` | Fallback người nhận tin báo (UID, nhiều người ngăn bằng phẩy) |
| `ZALO_TOKEN_SOURCE_DB_URL` | DB worker Go — bật chế độ **dùng chung token** |
| `ZALO_WEBHOOK_FORWARD_URL` | Chuyển tiếp nguyên văn webhook sang Go |
| `ZALO_OA_REFRESH_TOKEN` | **Chỉ bootstrap 1 lần** rồi xoá (Zalo vô hiệu nó sau lần dùng đầu) |

### Khác

| Biến | Ý nghĩa |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Realtime màn Phản hồi (**public** — chỉ dùng anon key). Thiếu thì màn vẫn chạy, chỉ mất realtime |
| `SUPABASE_SERVICE_ROLE_KEY` | Upload ảnh template lên Storage bucket `template-images`. Thiếu thì fallback lưu bytes vào DB |
| `APP_BASE_URL` | Bỏ trống = suy từ header request. Khai khi chạy sau proxy lạ |
| `TELEGRAM_BOSS_CHAT_ID` | Fallback người nhận tin báo qua Telegram |
| `AUTO_REPLY_COOLDOWN_MIN` | Cooldown trả lời tự động (mặc định 60 phút) |
| `ACTIVITY_LOG_DAYS` | Số ngày giữ nhật ký (mặc định 30) |

> 📌 `.env.example` đã liệt kê **đủ 29 biến** mà code đọc (đối chiếu tự động bằng cách grep
> `process.env.*` trong `src/`). Riêng `DIRECT_URL` chỉ Prisma CLI dùng (`prisma.config.ts`),
> không xuất hiện trong `src/`.
>
> Biến **bỏ trống được** vì đã có mặc định trong code: `SEND_DRY_RUN` (`true`),
> `SEND_WORKER_POLL_MS` (`8000`), `AUTO_REPLY_COOLDOWN_MIN` (`60`), `ACTIVITY_LOG_DAYS` (`30`),
> `QUOTA_SAFETY_RATIO` (`0.9`), `WHATSAPP_API_VERSION` (`v22.0`),
> `ZALO_OA_ID`/`APP_BASE_URL`/`ZALO_OAUTH_CALLBACK_URL` (tự suy).

## Chạy bằng Docker

```bash
docker compose up --build          # app tại http://localhost:3000
docker compose run --rm migrate    # áp migration lên DB (một lần)
```

`Dockerfile` multi-stage (`deps` → `builder` → `runner`), dùng Next.js **standalone** và chạy bằng
user không phải root. `.dockerignore` loại `.env` → **API key và connection string không bị nhúng
vào image**, container đọc từ `env_file` lúc chạy.

Dev offline không cần Supabase:

```bash
docker compose --profile local-db up --build
# rồi trỏ .env về: postgresql://postgres:postgres@db:5432/baogia
```

## PWA

`public/manifest.webmanifest` + `public/sw.js` (network-first, **bỏ qua `/api/`** để dữ liệu luôn
mới). `RegisterSW` đăng ký service worker ở layout gốc → cài được lên điện thoại, có cache dự phòng
khi mất mạng.

## Ghi chú & giới hạn cần biết

- **Đăng nhập chỉ được kiểm ở phía client.** Không có `middleware.ts` và **không route API nào
  kiểm tra session/role**. Layout `(app)` đọc session từ `localStorage` rồi redirect `/login` —
  chặn được UI, nhưng **ai biết URL vẫn gọi được API** (kể cả tạo user, xoá dữ liệu, ngắt Zalo).
  Danh tính trong nhật ký (`x-actor-id`/`x-actor-name` do `ActorHeaders` gắn) cũng do client tự
  khai, chỉ có giá trị tham khảo. Cần siết thì thêm kiểm tra ở tầng API/middleware.
- **Webhook WhatsApp POST không kiểm chữ ký** `X-Hub-Signature-256` (khác webhook Zalo có kiểm).
- **`SEND_DRY_RUN` mặc định là giả lập** — quên đặt `false` thì tin KHÔNG hề được gửi thật, nhưng
  log gửi vẫn hiện "Đã gửi"; dấu hiệu duy nhất là mã `DRYRUN-<uuid>`. Vì vậy app cảnh báo ở 2 chỗ:
  dòng log lúc khởi động và dải vàng trên màn Gửi báo giá.
- **Nuốt lỗi có chủ đích ở vài chỗ**: `maybeAutoReply` và `notifyInboundReply` không bao giờ ném lỗi
  (lỗi auto-reply không được làm hỏng việc nhận tin); webhook Zalo luôn trả 200.
- **Huỷ lệnh** (`cancelSend`) đã huỷ luôn job `QUEUED`/`HOLD` → `FAILED` kèm lý do. Nhưng batch
  `CANCELLED`/`PARTIAL_FAILED` vẫn **confirm lại được** (chưa có guard trạng thái).
- **Còn sót code prototype**: `src/features/mock/` (`Screens.tsx`, `Screens2.tsx`, `Modals.tsx`) và
  `src/components/layout/data.ts` dùng dữ liệu giả, vẫn nối vào 3 route `/bao-gia/tao`,
  `/bao-gia/mau`, `/bao-gia/chi-tiet`. Các màn còn lại đã dùng API thật.

## Tài liệu khác

| File | Nội dung |
|---|---|
| [`docs/zalo-oa.md`](docs/zalo-oa.md) | Kết nối Zalo OA từng bước, PKCE, làm mới token, webhook, các bẫy đã gặp |
| [`AGENTS.md`](AGENTS.md) | Cảnh báo breaking changes của Next.js bản này (auto-generate bởi `next dev`) |

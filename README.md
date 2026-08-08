# ago_baogia

Dự án **Next.js Fullstack** — vừa làm frontend vừa làm backend trong cùng một project, dùng **App Router** + **TypeScript** + **Tailwind CSS** + **Prisma 7** + **PostgreSQL (Supabase)**.

App báo giá (chuyển từ Telegram bot sang lưu trữ bằng database).

## Yêu cầu

- Node.js >= 18 (khuyến nghị 20+)
- npm

## Cài đặt & chạy

```bash
npm install        # cài dependencies (chỉ cần lần đầu)
npm run dev        # chạy chế độ dev tại http://localhost:3000
```

Các lệnh khác:

| Lệnh | Mô tả |
|------|-------|
| `npm run dev` | Chạy dev server (hot reload) |
| `npm run build` | Build bản production |
| `npm start` | Chạy bản production sau khi build |
| `npm run lint` | Kiểm tra lỗi ESLint |

## Cấu trúc dự án

```
ago_baogia/
├── prisma/
│   ├── schema.prisma           # Định nghĩa DB (models: users, roles, quotations...)
│   ├── schema.sql              # SQL thô sinh từ schema (tham khảo/chạy tay)
│   ├── seed.ts                 # Dữ liệu mẫu (npm run db:seed)
│   └── migrations/             # Lịch sử migration (tạo sau khi chạy db:migrate)
├── src/
│   ├── app/                    # App Router — mỗi thư mục là một route (URL)
│   │   ├── layout.tsx          # Layout gốc, bọc toàn bộ ứng dụng
│   │   ├── page.tsx            # FRONTEND: trang chủ "/"
│   │   ├── globals.css         # CSS toàn cục (Tailwind)
│   │   ├── favicon.ico
│   │   └── api/                # BACKEND: các API route
│   │       ├── hello/route.ts     #   GET/POST /api/hello (demo)
│   │       ├── users/route.ts     #   GET/POST /api/users (dùng Prisma)
│   │       └── channels/route.ts  #   GET/POST /api/channels (kênh gửi báo giá)
│   └── lib/
│       ├── prisma.ts           # Prisma Client singleton (dùng driver adapter)
│       ├── json.ts             # Helper trả JSON có BigInt
│       └── channels.ts         # Đọc API key kênh từ env (server-only)
├── prisma.config.ts            # Cấu hình Prisma CLI (Prisma 7)
├── Dockerfile                  # Build image production (Next.js standalone)
├── docker-compose.yml          # Service app / migrate / db (Postgres local)
├── .dockerignore               # Loại file thừa khỏi Docker build
├── .env                        # Connection string + API key thật (KHÔNG commit)
├── .env.example                # Mẫu connection string + API key các kênh
├── public/                     # File tĩnh: ảnh, svg, icon...
├── package.json                # Dependencies & scripts
├── next.config.ts              # Cấu hình Next.js
├── tsconfig.json               # Cấu hình TypeScript
├── eslint.config.mjs           # Cấu hình ESLint
├── postcss.config.mjs          # Cấu hình Tailwind / PostCSS
└── .gitignore
```

## Database (Prisma + Supabase)

### 1. Lấy connection string từ Supabase

Supabase Dashboard → **Connect** → **ORMs** → **Prisma**. Copy 2 URL vào file `.env`:

- `DATABASE_URL`: **Transaction pooler** (port `6543`, có `?pgbouncer=true`) — runtime dùng.
- `DIRECT_URL`: **Direct connection** (port `5432`) — Prisma dùng khi migrate.

Đồng thời điền API key các kênh gửi báo giá (`TELEGRAM_BOT_TOKEN_MAIN`, ...) — xem mục
[Kênh gửi báo giá](#kênh-gửi-báo-giá-bảng-channels). Tất cả có mẫu ở [`.env.example`](.env.example).

### 2. Tạo bảng trong database

```bash
npm run db:migrate       # tạo migration + áp schema vào Supabase
npm run db:seed          # (tuỳ chọn) chèn dữ liệu mẫu
```

> Không muốn dùng Prisma Migrate? Có thể mở [`prisma/schema.sql`](prisma/schema.sql) và dán trực tiếp vào **SQL Editor** trên Supabase.

### 3. Các lệnh Prisma

| Lệnh | Mô tả |
|------|-------|
| `npm run db:migrate` | Tạo & áp migration (khi sửa `schema.prisma`) |
| `npm run db:deploy` | Áp migration ở production |
| `npm run db:push` | Đẩy nhanh schema vào DB (không tạo file migration) |
| `npm run db:studio` | Mở Prisma Studio (GUI xem/sửa dữ liệu) |
| `npm run db:seed` | Chèn dữ liệu mẫu |
| `npm run db:generate` | Sinh lại Prisma Client |

### Sơ đồ quan hệ (từ thiết kế DBML)

| Quan hệ | Loại | Bảng trung gian |
|---------|------|-----------------|
| user ↔ role | N–N | `user_roles` |
| user ↔ quotation | N–N | `user_quotations` |
| category → template | 1–N | — |
| quotation → template_sends | 1–N | — |
| template → template_sends | 1–N | — |
| template → customer | 1–N | — |
| customer ↔ audit_log | 1–1 | — (`customer_id` unique) |
| audit_log → user (changed_by) | N–1 | — |
| `channels` | (bảng độc lập) | kênh gửi báo giá — xem mục dưới |

> **Lưu ý:** khoá chính là `BigInt`. Khi trả về API phải chuyển BigInt → string
> (đã xử lý sẵn trong [`src/lib/json.ts`](src/lib/json.ts)).

## Kênh gửi báo giá (bảng `channels`)

Mỗi dòng = **1 tài khoản trên 1 nền tảng** (Telegram / Zalo / WhatsApp) dùng để gửi báo giá cho khách.

| Cột | Kiểu | Ý nghĩa |
|-----|------|---------|
| `id` | BigInt (PK) | Khóa chính |
| `name` | varchar(150) | Tên hiển thị, vd "Telegram CSKH" |
| `type` | varchar(20) | Nền tảng: `TELEGRAM` / `ZALO` / `WHATSAPP` |
| `account_id` | varchar(255) | ID tài khoản trên nền tảng (bot id / Zalo OA id / WhatsApp phone id) |
| `api_key_env` | varchar(100) | **TÊN biến env** chứa API key (KHÔNG phải key thật) |
| `is_active` | boolean | Bật/tắt kênh |
| `note` | text | Ghi chú |
| `created_at` / `updated_at` | timestamp | Thời gian |

Ràng buộc `UNIQUE(type, account_id)` để không trùng 1 tài khoản trên cùng nền tảng.

### API key nằm trong env, DB chỉ giữ tên biến

Đây là điểm cốt lõi về bảo mật: **DB không bao giờ lưu API key thật**. Cột `api_key_env`
chỉ lưu tên biến môi trường, key thật để trong `.env`.

```
DB: channels.api_key_env = "TELEGRAM_BOT_TOKEN_MAIN"
                │
                ▼
      process.env["TELEGRAM_BOT_TOKEN_MAIN"]   ←  key thật ở .env
```

Trong `.env` khai báo key thật (tên biến khớp với `api_key_env`):

```bash
TELEGRAM_BOT_TOKEN_MAIN="123456:ABC-..."
ZALO_OA_TOKEN_MAIN="..."
WHATSAPP_TOKEN_MAIN="..."
```

Lấy key thật trong code bằng helper [`src/lib/channels.ts`](src/lib/channels.ts):

```ts
import { getChannelApiKey } from "@/lib/channels";

const channel = await prisma.channel.findFirst({
  where: { type: "TELEGRAM", isActive: true },
});
const token = getChannelApiKey(channel); // đọc từ process.env, KHÔNG từ DB
// ...dùng token gọi API Telegram/Zalo/WhatsApp
```

> Helper có `import "server-only"` nên tuyệt đối không bị lộ ra phía client.
> API `GET /api/channels` cũng chỉ trả `api_key_env`, **không bao giờ** trả key thật.

## Chạy bằng Docker

Dự án đã có sẵn [`Dockerfile`](Dockerfile) (multi-stage, dùng Next.js standalone) và
[`docker-compose.yml`](docker-compose.yml).

### Chạy app (kết nối Supabase)

Điền `.env` (như phần Database ở trên), rồi:

```bash
docker compose up --build
```

App chạy tại http://localhost:3000. Container đọc biến môi trường từ `.env`
(qua `env_file`) — **API key và connection string không bị nhúng vào image**.

### Chạy migration lên DB (một lần)

```bash
docker compose run --rm migrate
```

Service `migrate` chạy `prisma migrate deploy` rồi thoát (không tự khởi động cùng `up`).

### (Tuỳ chọn) Postgres chạy local thay cho Supabase

Mặc định service `db` không chạy. Muốn dev offline với Postgres trong Docker:

```bash
docker compose --profile local-db up --build
```

Khi đó sửa `.env` trỏ về Postgres nội bộ:

```bash
DATABASE_URL="postgresql://postgres:postgres@db:5432/baogia"
DIRECT_URL="postgresql://postgres:postgres@db:5432/baogia"
```

| File | Vai trò |
|------|---------|
| `Dockerfile` | Build image production (stage `deps` → `builder` → `runner`) |
| `.dockerignore` | Loại `node_modules`, `.next`, `.env`... khỏi build context |
| `docker-compose.yml` | Service `app`, `migrate` (profile `tools`), `db` (profile `local-db`) |

## Cơ chế Frontend + Backend

Next.js App Router gộp cả frontend và backend trong `src/app/`. Quy tắc:

- **Mỗi thư mục trong `src/app/` = một đường dẫn (URL)**, tên thư mục chính là URL.
- File **`page.tsx`** → **giao diện (frontend)** của route đó.
- File **`route.ts`** → **API (backend)**. Export các hàm `GET`, `POST`, `PUT`, `DELETE`... ứng với HTTP method.
- Frontend gọi backend bằng `fetch("/api/hello")` — cùng server, không cần cấu hình CORS.

| Vai trò | File | URL |
|---------|------|-----|
| Frontend (chạy trên trình duyệt) | `src/app/page.tsx` | `/` |
| Backend (chạy trên server) | `src/app/api/hello/route.ts` | `/api/hello` |

### Ví dụ API backend

```ts
// src/app/api/hello/route.ts
export async function GET() {
  return NextResponse.json({ message: "Xin chào từ backend Next.js!" });
}
```

Truy cập http://localhost:3000/api/hello để xem kết quả JSON.

## Thêm route mới

- **Trang mới** (frontend): tạo `src/app/ten-trang/page.tsx` → truy cập tại `/ten-trang`
- **API mới** (backend): tạo `src/app/api/ten-api/route.ts` → gọi tại `/api/ten-api`
- **Route động**: tạo `src/app/api/users/[id]/route.ts` → gọi tại `/api/users/123`

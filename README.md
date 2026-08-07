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
│   │       ├── hello/route.ts  #   GET/POST /api/hello (demo)
│   │       └── users/route.ts  #   GET/POST /api/users (dùng Prisma)
│   └── lib/
│       ├── prisma.ts           # Prisma Client singleton (dùng driver adapter)
│       └── json.ts             # Helper trả JSON có BigInt
├── prisma.config.ts            # Cấu hình Prisma CLI (Prisma 7)
├── .env                        # Connection string thật (KHÔNG commit)
├── .env.example                # Mẫu connection string Supabase
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

Xem mẫu ở [`.env.example`](.env.example).

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

> **Lưu ý:** khoá chính là `BigInt`. Khi trả về API phải chuyển BigInt → string
> (đã xử lý sẵn trong [`src/lib/json.ts`](src/lib/json.ts)).

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

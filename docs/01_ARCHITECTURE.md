# Ago Báo giá Frontend — Architecture

## Layers

```text
Trình duyệt (React client components)
   │  getJSON / postJSON / ... (src/lib/api.ts), URL tương đối /api/...
   ▼
Next.js server (repo này)
   └─ src/app/api/[...path]/route.ts   ← proxy, không có nghiệp vụ
   │  server-to-server, theo BACKEND_URL
   ▼
Backend NestJS (baogia_be / repo ago_notification)
   └─ controller → service → Prisma/PostgreSQL, worker gửi tin, webhook, cron
```

| Tầng | Trách nhiệm | Nằm ở |
|---|---|---|
| Routing | URL → component | `src/app/` (chỉ render) |
| Feature UI | màn hình, form, schema | `src/features/<module>/` |
| Shared UI / layout | sidebar, topbar, UI chung | `src/components/{layout,shared}` |
| API client | gọi `/api/*`, chuẩn hoá lỗi | `src/lib/api.ts`, `api-error.ts` |
| Proxy | chuyển tiếp tới backend | `src/app/api/[...path]/route.ts` |
| Nghiệp vụ + DB | mọi thứ còn lại | backend NestJS |

## Request flow

1. Component gọi `getJSON("/api/customers?...")`. `apiUrl()` ghép `NEXT_PUBLIC_API_URL` (mặc định rỗng → same-origin).
2. `ActorHeaders` (đã bọc `window.fetch` một lần) gắn `x-actor-id` / `x-actor-name` vào mọi request tới `/api/*`.
3. Next.js khớp `src/app/api/[...path]/route.ts`; proxy dựng URL `${BACKEND_URL}/api/<path>?<query>` và gọi `fetch`.
4. Backend trả JSON (hoặc ảnh/redirect); proxy trả lại nguyên trạng cho trình duyệt.
5. `api.ts` đọc JSON; nếu `!res.ok` ném `Error(data.error || "Lỗi <status>")`; component hiển thị bằng toast/inline.

## Proxy behavior (`src/app/api/[...path]/route.ts`)

- Export `GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS` cùng một hàm `proxy`; `dynamic = "force-dynamic"`, `runtime = "nodejs"`.
- **Body nguyên byte** (`arrayBuffer()`), vì webhook ký HMAC trên byte gốc, upload ảnh template là body thô `image/*`, import file có thể vài MB. GET/HEAD không gửi body.
- **Header yêu cầu**: giữ nguyên (gồm `content-type`, `x-actor-*`, `x-hub-signature-256`, `x-zevent-signature`...), bỏ `host`, `connection`, `content-length`, `accept-encoding`, `origin`, `referer`, `keep-alive`, `transfer-encoding`, `upgrade`.
- **`redirect: "manual"`**: 3xx (ảnh template → URL storage, callback OAuth Zalo) trả nguyên cho trình duyệt cùng `location`, proxy không đi theo.
- **Header phản hồi**: bỏ `content-encoding`, `content-length`, `transfer-encoding`, `connection` (fetch đã giải nén); `set-cookie` chuyển tiếp từng cái.
- 101/204/205/304 và HEAD không gắn body.
- `cache: "no-store"`.
- Backend không với tới được (fetch lỗi) → **502** `{ "error": "Không kết nối được máy chủ (backend)." }`.
- `BACKEND_URL` đọc lúc module nạp (runtime), bỏ dấu `/` cuối, mặc định `http://localhost:4000`.

Lý do dùng proxy: trình duyệt chỉ nói chuyện với một origin (không CORS); webhook Meta/Zalo và OAuth callback có thể giữ domain FE; không lộ địa chỉ backend ra client.

## Folder tree

```text
baogia_whatapps/
├── AGENTS.md  CLAUDE.md  PLANS.md  README.md
├── .github/workflows/ci.yml
├── docs/                      # tài liệu (file này) + plans/
├── public/                    # PWA: manifest, service worker, icon
├── Dockerfile  docker-compose.yml  next.config.ts  vitest.config.mts
└── src/
    ├── app/
    │   ├── layout.tsx         # layout gốc: font, AuthProvider, Toaster, PWA, ActorHeaders
    │   ├── page.tsx           # "/" -> redirect /tong-quan
    │   ├── (auth)/login/
    │   ├── (app)/             # layout.tsx chặn chưa đăng nhập + AppChrome; mỗi thư mục = 1 màn
    │   └── api/[...path]/     # proxy (+ __tests__)
    ├── features/
    │   ├── auth/ channels/ customers/ dashboard/ inbox/ logs/ quotes/
    │   ├── receive-channels/ send/ sendjobs/ templates/ users/ zalo/
    │   └── mock/              # prototype còn sót (3 route /bao-gia/tao|mau|chi-tiet)
    ├── components/
    │   ├── layout/            # app-chrome, ago-context, routes.ts, use-ago, state, data (mock)
    │   └── shared/            # ui.tsx, country-select, actor-headers, register-sw
    ├── lib/                   # api, api-error, auth, countries, phone-type-meta, activity-labels, supabase
    └── test/                  # setup.ts của Vitest
```

## Environment variables

| Biến | Phạm vi | Ý nghĩa |
|---|---|---|
| `BACKEND_URL` | server, đọc lúc chạy | URL backend NestJS, đích của proxy (vd. `http://localhost:4000`). |
| `NEXT_PUBLIC_API_URL` | build-time, client | Tiền tố cho `apiUrl()`. Để **rỗng** = same-origin qua proxy (cách chuẩn). |
| `NEXT_PUBLIC_SUPABASE_URL` | build-time, client | Chỉ cho Realtime màn Phản hồi; thiếu thì màn vẫn chạy, tải lại thủ công. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | build-time, client | Key public (anon) của Supabase, không phải secret. |

Biến `NEXT_PUBLIC_*` được nhúng vào bundle lúc `next build`: khi build Docker phải truyền đúng. File `.env` không được commit; mẫu ở `.env.example`.

## Deployment

- `next.config.ts` đặt `output: "standalone"`; `Dockerfile` nhiều tầng (deps → builder → runner), chạy `node server.js` cổng 3000 bằng user không phải root.
- Build không cần backend. Runtime cần `BACKEND_URL` tới được backend.
- Webhook Meta/Zalo và OAuth callback Zalo: trỏ tới domain đến được backend (qua proxy FE hoặc trực tiếp). Backend cần `APP_BASE_URL` = domain công khai của FE để Zalo OAuth quay về `/zalo-oa`.
- Chỉ chạy một worker gửi tin, ở backend.

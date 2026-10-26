<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AGENTS.md — Ago Báo giá Frontend Coding Instructions

## Project Context

Ago Báo giá là công cụ nội bộ của Ago Group: quản lý báo giá, template, khách hàng và **gửi báo giá đa kênh** (WhatsApp / Zalo), nhận phản hồi của khách rồi báo về Zalo cho người phụ trách.

Repo này CHỈ là **frontend** (Next.js 16 App Router). Toàn bộ nghiệp vụ, database, worker gửi tin, webhook Meta/Zalo, OAuth Zalo nằm ở backend NestJS riêng: `D:\project_ago_fruit\ago_bao_gia\baogia_be` (repo `ago_notification`).

Luồng: trình duyệt → `/api/*` (cùng origin với FE) → proxy `src/app/api/[...path]/route.ts` → `BACKEND_URL` (NestJS). FE không có Prisma, không truy cập DB, không chạy worker.

Chi tiết: `docs/00_PROJECT_CONTEXT.md`, `docs/01_ARCHITECTURE.md`, `docs/02_MODULE_MAP.md`, `docs/03_API_RULES.md`. Đọc `docs/02_MODULE_MAP.md` và hợp đồng backend (`baogia_be/docs/06_FE_CONTRACT.md`) trước khi làm tính năng đụng API.

## Tech Stack

- Next.js 16 (App Router, `output: "standalone"`) + React 19 + TypeScript
- Tailwind CSS 4
- Zod 4 (validate form), Sonner (toast), xlsx (đọc file import khách hàng)
- `@supabase/supabase-js` (chỉ Realtime màn Phản hồi, dùng key public)
- Vitest + React Testing Library + jsdom (unit test, dev-only)

Không thêm thư viện mới cho vấn đề stack hiện tại đã giải được. Giữ FE nhẹ.

## Architecture Rule: Feature-first

```text
src/
├── app/                 # App Router: routing + layout, KHÔNG chứa nghiệp vụ
│   ├── (auth)/login     # nhóm route chưa đăng nhập
│   ├── (app)/           # nhóm route đã đăng nhập (sidebar/topbar chung)
│   └── api/[...path]/   # proxy /api/* -> backend NestJS
├── features/<module>/   # components/ (+ schemas/, hooks/ khi cần) theo từng nghiệp vụ
├── components/
│   ├── layout/          # app-chrome, ago-context, routes.ts, state
│   └── shared/          # UI dùng chung (ui.tsx, country-select, actor-headers...)
├── lib/                 # api.ts, api-error.ts, auth.tsx, countries.ts, ... (hàm thuần/tiện ích)
└── test/                # hạ tầng unit test (setup) — không chứa test nghiệp vụ
```

- `page.tsx` chỉ render component từ `features/`. Không nhét fetch/state ad-hoc vào page.
- Component trong `features/<module>/components/` gom theo nghiệp vụ con khi module lớn; không để hàng chục file phẳng.
- **Feature không import nội bộ của feature khác.** Cái dùng chung đưa lên `src/components/shared` hoặc `src/lib`.
- Không tạo thư mục rỗng / scaffold trước khi cần.
- `src/features/mock/` và `components/layout/data.ts` là code prototype còn sót (3 route `/bao-gia/tao|mau|chi-tiet`); không phát triển thêm trên đó, khi thay bằng màn thật thì xoá hẳn.

## API Rule

- Mọi lời gọi backend đi qua `src/lib/api.ts` (`getJSON`, `postJSON`, `putJSON`, `patchJSON`, `sendJSON`) với URL **tương đối** `/api/...`.
- Không gọi thẳng host backend từ component, không hardcode `http://...`. `NEXT_PUBLIC_API_URL` chỉ để trống (same-origin qua proxy) trừ khi có lý do đặc biệt.
- Không hardcode route: đường dẫn màn hình nằm ở `src/components/layout/routes.ts`.
- Lỗi backend dạng `{ "error": "..." }` — `api.ts` ném `Error(message)`; hiển thị bằng toast hoặc inline qua `apiErrorMessage(err, fallback)` (`lib/api-error.ts`).
- Id BigInt từ backend là **chuỗi**. Không `Number(id)` rồi gửi lại.
- Không thêm logic nghiệp vụ / truy cập DB vào FE; cần thì làm ở backend. Chi tiết: `docs/03_API_RULES.md`.

## Naming Convention

- File và thư mục: kebab-case (`customers-screen.tsx`, `customer-schema.ts`, `use-ago.ts`).
- Component: PascalCase. Hook: `useXxx`. Schema Zod: `xxxSchema`.

## Coding Rules

- TypeScript strict. Không dùng `any` (nếu bắt buộc vì thư viện không có type thì cô lập một chỗ và comment lý do).
- Server Component mặc định; chỉ thêm `"use client"` khi cần hook/tương tác.
- Dùng Tailwind + token màu sẵn có; component UI dùng chung nằm ở `components/shared/ui.tsx`.
- Mobile usable: mọi màn dùng được ở chiều rộng 390px.
- Chỉ sửa trong phạm vi được yêu cầu; cần đụng code dùng chung thì báo rõ.

## Testing Rule

- Công cụ: Vitest + React Testing Library, môi trường `jsdom`. Lệnh: `npm run test` (chạy 1 lần — CI dùng), `npm run test:watch`.
- Vị trí: thư mục `__tests__/` cạnh code, tên `<tên-file>.test.ts(x)` (vd. `src/lib/__tests__/api.test.ts`).
- Bắt buộc có test: hàm thuần trong `lib/`, schema Zod (hợp lệ + từng kiểu sai báo đúng ô, đúng câu), proxy `/api`, hook, và component có logic (ẩn/hiện theo trạng thái, chặn submit, gọi callback).
- Không bắt buộc: component thuần trình bày, `page.tsx` chỉ render.
- Cách mock: `vi.stubGlobal("fetch", vi.fn())` — KHÔNG gọi mạng thật, KHÔNG phụ thuộc backend đang chạy. Env dùng `vi.stubEnv` (nhớ `vi.unstubAllEnvs()`). File chạy trên Node thuần (route handler) thêm dòng đầu `// @vitest-environment node`.
- Import tường minh `import { describe, it, expect, vi } from "vitest"` — không bật `globals`.
- Test phải deterministic: không phụ thuộc giờ thực, thứ tự, mạng.
- jsdom thiếu API trình duyệt nào thì vá tối thiểu trong `src/test/setup.ts` kèm comment lý do.

## Code Comment Rule

Khi tạo/sửa layout shell, provider, proxy, helper hạ tầng hoặc logic không hiển nhiên, thêm block comment ngắn bằng tiếng Việt giải thích **vì sao**:

```tsx
/*
 * Giải thích component/hook/config này làm gì.
 * Nêu quy tắc nghiệp vụ hoặc kiến trúc quan trọng nếu có.
 */
```

Không viết comment chỉ lặp lại tên hàm.

## CI Rule

`.github/workflows/ci.yml` chạy `npm ci → lint → test → build` khi push/PR vào `main` và `dev`. Mọi thay đổi phải giữ CI xanh. Chưa có CD trong workflow: `main` là production trên Render (Docker standalone), deploy do Render tự lấy từ nhánh.

## Git Workflow Rule

Owner điều khiển git. KHÔNG tự chạy `git commit`, `git push`, tạo/đổi nhánh, merge, stash trừ khi owner yêu cầu đúng hành động đó.

- `main` = production (Render). Làm việc trên `dev`.
- Làm xong → chạy `npm run lint`, `npm run test`, `npm run build` → báo "ready" → chờ owner.
- Không bao giờ đọc/in/commit file `.env` (chứa secret production). Chỉ `.env.example` được commit.

## Planning Rule

Việc lớn (module mới, đổi app shell, đổi auth, đổi lớp API/proxy, việc trải nhiều feature) phải có plan trước khi code. Quy tắc và vị trí plan: xem `PLANS.md`; mẫu: `docs/plans/PLANS_TEMPLATE.md`.

## Done Definition

Trước khi báo xong:

- `npm run lint` pass.
- `npm run test` pass; logic mới/sửa (hàm thuần, schema, proxy, hook, component có logic) có unit test.
- `npm run build` pass, không lỗi TypeScript.
- Đúng cấu trúc feature-first; feature không import nội bộ của feature khác.
- Không hardcode URL backend / route path; mọi API qua `src/lib/api.ts`.
- Màn hình dùng được ở chiều rộng mobile.
- Không rò secret; tài liệu trong `docs/` được cập nhật nếu đổi route, API hoặc kiến trúc.

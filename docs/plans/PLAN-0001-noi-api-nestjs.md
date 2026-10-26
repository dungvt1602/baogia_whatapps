# PLAN-0001 — Nối FE sang backend NestJS

> Status: Done
> Owner: Developer / Agent
> Related Docs: `docs/01_ARCHITECTURE.md`, `docs/02_MODULE_MAP.md`, `docs/03_API_RULES.md`

---

## 1. Goal

Chuyển app từ "Next.js fullstack" (route handler + Prisma + worker trong cùng project) sang:

* **Frontend** (repo này): chỉ giao diện, gọi `/api/*` qua proxy.
* **Backend NestJS** (`baogia_be`, repo `ago_notification`): toàn bộ nghiệp vụ, DB, worker gửi tin, webhook Meta/Zalo, OAuth Zalo.

---

## 2. Context

Trước đây `src/app/api/**` và `src/server/**` chứa nghiệp vụ + Prisma. Backend NestJS giữ cùng hợp đồng (`baogia_be/docs/06_FE_CONTRACT.md`) nên FE chỉ cần trỏ `/api/*` sang đó, không đổi lời gọi ở các màn.

---

## 3. Scope

### In Scope

* Proxy `src/app/api/[...path]/route.ts` chuyển tiếp `/api/*` → `BACKEND_URL` (giữ nguyên byte body, redirect, header danh tính).
* Xoá code server khỏi FE (Prisma, `src/server`, route handler cũ, worker, script).
* Tái cấu trúc feature-first, tên file kebab-case.
* Unit test (Vitest) cho `lib/`, schema, proxy.
* CI GitHub Actions (lint + test + build).
* Tài liệu: `AGENTS.md`, `PLANS.md`, `README.md`, `docs/*`.

### Out of Scope

* CD / deploy tự động trong workflow.
* Thay 3 màn prototype (`/bao-gia/tao|mau|chi-tiet`) bằng màn thật.
* Siết xác thực (session vẫn kiểm ở client) — ghi ở follow-up.

---

## 4. Affected Features / Areas

* `src/app/api/[...path]/`
* `src/features/*`, `src/components/{layout,shared}`, `src/lib/*`
* `package.json`, `vitest.config.mts`, `.github/workflows/ci.yml`, `Dockerfile`, `docker-compose.yml`
* `AGENTS.md`, `PLANS.md`, `README.md`, `docs/*`

---

## 5. Routes & Screens

Route màn hình giữ nguyên (xem `docs/02_MODULE_MAP.md`). Chỉ thêm route kỹ thuật `/api/[...path]` (proxy).

---

## 6. API Integration

Toàn bộ endpoint backend `/api/*` đi qua proxy; danh sách theo module ở `docs/02_MODULE_MAP.md`.

---

## 7. State & Forms

Không đổi. Schema form khách hàng ở `src/features/customers/schemas/customer-schema.ts`.

---

## 8. Implementation Steps

* [x] Viết proxy `/api/*` → `BACKEND_URL` (không CORS, body nguyên byte, `redirect: "manual"`, 502 khi backend không với tới được).
* [x] Bỏ code server khỏi FE (Prisma, services, route handler, worker, script).
* [x] Tổ chức lại theo feature-first (`src/features/<module>/{components,schemas}`, `src/components/{layout,shared}`, `src/lib`), tên file kebab-case.
* [x] Đổi Dockerfile / docker-compose / `.env.example` chỉ còn `BACKEND_URL`, `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SUPABASE_*`.
* [x] Thêm Vitest + jsdom + Testing Library; viết test cho `api.ts`, `api-error.ts`, `countries.ts`, `phone-type-meta.ts`, `customer-schema.ts`, proxy.
* [x] Thêm CI: `npm ci → lint → test → build` trên push/PR vào `main`, `dev`.
* [x] Viết `AGENTS.md`, `PLANS.md`, `README.md`, `docs/00..03`, template plan; sửa `docs/zalo-oa.md` trỏ về backend.

---

## 9. Validation / Test Plan

* [x] `npm run lint` pass.
* [x] `npm run test` pass.
* [x] `npm run build` pass (không cần backend lúc build).
* [x] Không import chéo giữa các feature.
* [x] Không hardcode URL backend trong component.

---

## 10. Risks / Notes

* **Deploy cần thêm dịch vụ backend** và đặt `BACKEND_URL` cho FE (đọc lúc chạy, không phải lúc build).
* **Webhook Meta/Zalo và OAuth callback Zalo** phải trỏ tới domain mà đến được backend. Nếu giữ domain FE thì proxy chuyển tiếp nguyên byte (chữ ký HMAC vẫn đúng); nếu trỏ thẳng domain backend thì cập nhật cấu hình bên Meta/Zalo.
* **Chỉ chạy ĐÚNG MỘT worker gửi tin** (ở backend). Worker cũ trong FE đã bị xoá; không bật thêm tiến trình gửi thứ hai.
* Đặt `APP_BASE_URL` của backend = domain công khai của FE để Zalo OAuth quay về `/zalo-oa`.
* Đăng nhập vẫn kiểm ở client (localStorage); danh tính `x-actor-*` do client khai, chỉ mang tính tham khảo.

---

## 11. Progress Log

| Date       | Progress                             | Notes                                    |
| ---------- | ------------------------------------ | ---------------------------------------- |
| 2026-10    | Nối FE sang backend NestJS qua proxy | commit `d347a05`                         |
| 2026-10    | Tái cấu trúc feature-first           | commit `fa1c731`                         |
| 2026-10-19 | Test + CI + tài liệu (phase B2)      | Vitest, ci.yml, AGENTS/PLANS/README/docs |

---

## 12. Files Changed

```text
src/app/api/[...path]/route.ts (+ __tests__)
src/lib/__tests__/*, src/features/customers/schemas/__tests__/*
src/test/setup.ts, vitest.config.mts, package.json, package-lock.json
.github/workflows/ci.yml
AGENTS.md, PLANS.md, README.md
docs/00_PROJECT_CONTEXT.md, docs/01_ARCHITECTURE.md, docs/02_MODULE_MAP.md, docs/03_API_RULES.md
docs/zalo-oa.md, docs/plans/*
```

---

## 13. Follow-up Tasks

* [ ] Thay 3 màn prototype (`/bao-gia/tao|mau|chi-tiet`) bằng màn thật, xoá `src/features/mock/` và `components/layout/data.ts`.
* [ ] Siết xác thực ở backend (token/session thật) rồi bỏ phụ thuộc `x-actor-*` tự khai.
* [ ] Thêm test component cho các màn có logic (send flow, customers).

---

## 14. Definition of Done

* [x] lint + test + build pass.
* [x] Đúng cấu trúc feature-first.
* [x] API qua `src/lib/api.ts`.
* [x] Checklist plan và progress log đã cập nhật.
* [x] Follow-up được ghi lại.

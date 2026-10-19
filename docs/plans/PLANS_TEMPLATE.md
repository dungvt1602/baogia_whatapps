# PLAN-XXXX — Tên task

> Status: Draft / In Progress / Blocked / Done
> Owner: Developer / Agent
> Related Docs: `docs/02_MODULE_MAP.md`, `docs/03_API_RULES.md`

---

## 1. Goal

Mục tiêu của task:

* ...
* ...

---

## 2. Context

Ago Báo giá FE là:

* Next.js App Router, feature-first, chỉ làm giao diện
* Mọi nghiệp vụ + DB ở backend NestJS (`baogia_be`), FE gọi qua proxy `/api/*` → `BACKEND_URL`

Tài liệu tham chiếu:

* `AGENTS.md`
* `README.md`
* `docs/01_ARCHITECTURE.md`
* `docs/03_API_RULES.md`

---

## 3. Scope

### In Scope

* ...

### Out of Scope

* ...

---

## 4. Affected Features / Areas

* src/features/...
* src/components/...
* src/lib/...

---

## 5. Routes & Screens

```text
/ten-route            # màn danh sách
/ten-route/[id]       # màn chi tiết
```

Ghi chú:

* Route khai báo trong `src/components/layout/routes.ts`.
* `page.tsx` chỉ render component từ `features/`.

---

## 6. API Integration

Liệt kê endpoint backend sẽ dùng.

```text
GET    /api/...
POST   /api/...
```

Ghi chú:

* Mọi lời gọi qua `src/lib/api.ts`, URL tương đối `/api/...`.
* Lỗi backend dạng `{ "error": "..." }`.

---

## 7. State & Forms

* Hook / state: ...
* Zod schema: ...

---

## 8. Implementation Steps

* [ ] Bước 1: ...
* [ ] Bước 2: ...
* [ ] Bước 3: ...

---

## 9. Validation / Test Plan

* [ ] `npm run lint` pass.
* [ ] `npm run test` pass (logic mới có unit test).
* [ ] `npm run build` pass.
* [ ] Màn hình chạy đúng khi backend đang chạy.
* [ ] Màn hình báo lỗi rõ ràng khi backend tắt (proxy trả 502).
* [ ] Dùng được ở 390px.
* [ ] Không import chéo giữa các feature.
* [ ] Không hardcode URL backend / route.

---

## 10. Risks / Notes

* Risk:
* Assumption:
* Open question:
* Blocker:

---

## 11. Progress Log

| Date       | Progress | Notes    |
| ---------- | -------- | -------- |
| YYYY-MM-DD | Tạo plan | Bản nháp |

---

## 12. Files Changed

Cập nhật sau khi code.

```text
src/...
docs/...
```

---

## 13. Follow-up Tasks

* [ ] ...

---

## 14. Definition of Done

* [ ] lint + test + build pass.
* [ ] Đúng cấu trúc feature-first.
* [ ] API qua `src/lib/api.ts`.
* [ ] Checklist plan và progress log đã cập nhật.
* [ ] Docs liên quan (`docs/*`) đã cập nhật.
* [ ] Follow-up được ghi lại.

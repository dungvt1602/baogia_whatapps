# PLANS.md — Ago Báo giá Frontend Planning Rules

## Purpose

File này quy định cách tạo và duy trì kế hoạch triển khai (plan) cho frontend Ago Báo giá.

Plan bắt buộc với việc lớn: module mới, đổi app shell, đổi auth, đổi lớp API/proxy, việc trải nhiều feature.

Ago Báo giá FE là Next.js App Router, feature-first, chỉ làm giao diện; nghiệp vụ và database ở backend NestJS (`baogia_be`, repo `ago_notification`).

---

## When to Create a Plan

Tạo plan trước khi code khi task:

- Thêm module mới dưới `src/features/`
- Thêm/đổi nhiều màn hình / route
- Đổi app shell (sidebar, header, layout, `routes.ts`)
- Đổi xác thực / phân quyền / cách gắn danh tính (`x-actor-*`)
- Đổi lớp API dùng chung (`src/lib/api.ts`) hoặc proxy `src/app/api/[...path]/route.ts`
- Đổi hợp đồng với backend (envelope lỗi, kiểu id, endpoint)
- Bất kỳ việc nào trải nhiều feature

Sửa lỗi nhỏ không cần plan, trừ khi ảnh hưởng routing, auth, lớp API hoặc hợp đồng giữa các feature.

---

## Plan File Location

Mọi plan nằm trong:

```text
docs/plans/
```

## Plan File Naming

```text
PLAN-0001-noi-api-nestjs.md
PLAN-0002-<ten-ngan-gon>.md
```

Đánh số tăng dần. Nếu đã có plan liên quan thì cập nhật plan đó, không tạo trùng.

## Plan Template

Dùng `docs/plans/PLANS_TEMPLATE.md` làm điểm xuất phát cho mọi plan mới.

## Workflow

1. Đọc `AGENTS.md`, `README.md` và `docs/02_MODULE_MAP.md`.
2. Tạo hoặc cập nhật file plan trong `docs/plans/`.
3. Viết các bước thực hiện dạng checklist.
4. Không sửa code production trước khi có plan.
5. Tick checklist và cập nhật progress log khi làm.
6. Cập nhật "Files Changed" và "Definition of Done" khi xong.

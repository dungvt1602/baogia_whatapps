# PLAN-0002 — Báo giá nhà cung cấp (RFQ) qua Zalo (Frontend)

> Status: Draft → In progress
> Owner: Ago Group
> Liên quan: BE `ago_notification` PLAN-0001 (hợp đồng API nằm ở đó)

## 1. Mục tiêu
Màn hình quản lý NCC + yêu cầu báo giá (RFQ), gửi qua Zalo kèm hình, nút **Nhắn thử**, màn **so sánh giá**, và **trang công khai** `/ncc/<token>` để NCC nhập giá (mở từ nút trong tin Zalo, dùng được trên điện thoại, không đăng nhập).

## 2. Phạm vi
- Trong: `features/suppliers`, `features/supplier-rfqs`, trang công khai, mục menu, test.
- Ngoài: nhắc hạn, đa tiền tệ nâng cao, phân quyền.

## 3. Màn hình
1. **Nhà cung cấp** (`/nha-cung-cap`): bảng + thêm/sửa/xoá (tên, công ty, SĐT, email, Zalo user_id, ghi chú).
2. **Yêu cầu báo giá** (`/bao-gia-ncc`): danh sách (mã, tiêu đề, hạn, trạng thái, số NCC đã nộp/đã mời), nút tạo mới.
3. **Chi tiết RFQ** (`/bao-gia-ncc/[id]`): sửa thông tin + bảng mặt hàng, upload ảnh, chọn NCC để gửi (hiện NCC thiếu Zalo user_id), danh sách lời mời + trạng thái, nút **Nhắn thử** (chọn nhân viên đã liên kết Zalo hoặc nhập user_id), nút Đóng, tab **So sánh giá** (bảng mặt hàng × NCC, tô giá thấp nhất).
4. **Trang công khai** `/ncc/[token]` (ngoài khu vực đăng nhập): hiển thị ảnh/tiêu đề/hạn, bảng mặt hàng với ô nhập giá, MOQ, thời gian giao, ghi chú; nộp và sửa lại đến hạn; trạng thái hết hạn/không hợp lệ.

## 4. Quy tắc
Mọi gọi API qua `src/lib/api.ts` (URL tương đối `/api/...`); route khai báo ở `components/layout/routes.ts`; feature-first, tên file kebab-case; không import chéo feature; test cho schema, hàm thuần, logic component.

## 5. Các bước
- [x] Routes + menu + tiện ích định dạng tiền/ngày
- [x] Suppliers (list/form) + test
- [x] RFQ list/detail/form + ảnh + gửi + Nhắn thử + test
- [x] So sánh giá + test
- [x] Trang công khai nhập giá + test (validate số, hạn, trạng thái)
- [x] `npm run lint`, `npm run test`, `npm run build` xanh
- [ ] Kiểm tra thủ công với BE + DB thử
- [ ] Review độc lập

## 5b. Files changed
- Mới: `src/features/suppliers/**`, `src/features/supplier-rfqs/**` (components, schemas, utils, public, `__tests__`), `src/components/shared/modal.tsx`, `src/components/shared/badge.tsx`, `src/app/(app)/nha-cung-cap/page.tsx`, `src/app/(app)/bao-gia-ncc/page.tsx`, `src/app/(app)/bao-gia-ncc/[id]/page.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/ncc/[token]/page.tsx`.
- Sửa code dùng chung: `src/components/layout/routes.ts` (2 route), `src/components/layout/use-ago.ts` (menu, tiêu đề, ẩn nút "+ Báo giá mới"), `src/lib/api.ts` (thêm `ApiError` có `status`, tương thích `Error`), `src/lib/auth.tsx` (try/catch khi đọc localStorage để webview chặn storage không làm sập trang công khai), `src/test/setup.ts` (vá `window.scrollTo`).
- Docs: `docs/01_ARCHITECTURE.md`, `docs/02_MODULE_MAP.md`, `README.md`, file này.

- Sau review (vòng 2): `parseDecimalInput` từ chối số mơ hồ ("25.000"), giới hạn 14.4 chữ số, đơn giá > 0, ngày giao 0..3650; trang công khai khoá tiền tệ theo RFQ, hiện "Đơn giá hiểu là", chống bấm đúp bằng ref; so sánh giá không tô "thấp nhất" khi lẫn tiền tệ; gửi `resend` chỉ khi có NCC đã mời; kết quả `ok`+`error` coi là bỏ qua; `ApiError` mang `body`/`issues`, body không phải JSON thành `Lỗi <status>`; Zalo user_id `^\d{1,50}$`; Modal bỏ qua bấm nền khi busy; `public/sw.js` bỏ qua `/ncc/`; docs/03_API_RULES.md cập nhật.

- Yêu cầu mới của owner: BE tự tra SĐT -> Zalo user_id, nên NCC chỉ cần SĐT HOẶC Zalo user_id (người đó phải đã quan tâm OA). FE: badge "Chưa có SĐT/Zalo" (khi cả hai rỗng) / "Gửi bằng SĐT"; send card chọn được khi có SĐT hoặc user_id; "Nhắn thử" nhận user_id hoặc SĐT và hiện `resolvedUserId`.

## 6. Rủi ro
Trang công khai phải dùng được ở webview Zalo (không phụ thuộc localStorage/đăng nhập); BE phải có sẵn các bảng mới mới chạy được; Zalo có thể từ chối tin nếu NCC chưa tương tác OA — FE hiển thị nguyên thông báo lỗi.

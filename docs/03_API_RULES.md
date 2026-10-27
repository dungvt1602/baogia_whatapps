# Ago Báo giá Frontend — API Rules

Hợp đồng đầy đủ do backend giữ: `baogia_be/docs/06_FE_CONTRACT.md`. File này tóm tắt phần FE cần tuân thủ.

## Quy tắc gọi API

- Chỉ dùng helper trong `src/lib/api.ts`: `getJSON`, `postJSON`, `putJSON`, `patchJSON`, `sendJSON` (DELETE dùng `sendJSON("DELETE", ...)`).
- URL luôn tương đối `/api/...`; `apiUrl()` tự thêm `NEXT_PUBLIC_API_URL` (rỗng ở môi trường chuẩn). Không gọi thẳng host backend, không hardcode `http://...`.
- Không viết `fetch` thô cho JSON. Ngoại lệ có chủ đích: upload ảnh (body thô) và tải file.
- Route màn hình lấy từ `src/components/layout/routes.ts`, không gõ cứng chuỗi path.

## RFQ qua Zalo: người nhận
- `POST /api/supplier-rfqs/:id/send`: NCC gửi được khi có `zaloUserId` HOẶC `phone`; BE tra SĐT -> user_id. Lỗi tra (vd. "SĐT … chưa Quan tâm OA …") nằm ở `results[].error`; `ok` + `error` = bỏ qua.
- `POST /api/supplier-rfqs/:id/test-send`: `zaloUserId` nhận user_id hoặc SĐT (≤ 50 ký tự); phản hồi `{ok, mode:"buttons"|"text", link, error?, buttonError?, resolvedUserId?, zalo?}` (tin chữ kèm nút "Nhập giá" và dòng link dự phòng; ảnh RFQ không gửi vào chat Zalo, chỉ nằm trong form NCC). Lỗi Zalo/tra vẫn HTTP 200 với `ok:false` + `error`.

## Error envelope

- Lỗi luôn là JSON `{ "error": "<thông điệp tiếng Việt>" }`.
- Lỗi validate (zod phía backend): `{ "error": "Dữ liệu không hợp lệ", "issues": [...] }` với HTTP 400.
- `api.ts`: nếu `!res.ok` thì ném `ApiError` (là `Error`, thêm `status` và `body`) với message `data.error` hoặc `Lỗi <status>`; lỗi zod được nối ô lỗi đầu tiên ("Dữ liệu không hợp lệ: path — message"). Body không phải JSON (HTML 502/504, rỗng) được coi là `{}` -> `Lỗi <status>`, không còn ném lỗi parse. Hiển thị bằng `apiErrorMessage(err, fallback)` qua toast (Sonner) hoặc inline cạnh form.
- Proxy khi không nối được backend: HTTP **502** `{ "error": "Không kết nối được máy chủ (backend)." }`.
- Hạ tầng ở giữa trả HTML (vd. 502 của reverse proxy) -> `ApiError("Lỗi 502", 502)`; màn hình bắt lỗi và báo chung.

## Kiểu dữ liệu

- **Id và số đếm BigInt là chuỗi** (`"123"`). Giữ nguyên là string, không `Number()` rồi gửi lại. Schema chấp nhận `number | string` ở những chỗ id có thể đi vào (vd. `templateId`).
- Số điện thoại lưu dạng toàn chữ số, đã gồm mã vùng, 6-15 chữ số, không dấu `+` (xem `customer-schema.ts`, `countries.ts`).

## Status codes

| Mã | Ý nghĩa |
|---|---|
| 200 | Thành công (JSON) |
| 302 | Redirect (ảnh template sang storage; callback OAuth Zalo) — trình duyệt tự đi theo |
| 400 | Mutation lỗi / dữ liệu không hợp lệ |
| 401 | Đăng nhập sai |
| 404 | Không tìm thấy (báo giá, template, lệnh gửi) |
| 500 | Lỗi phía backend ở route đọc, cron, webhook |
| 502 | Proxy không nối được backend |

## Header danh tính

- `ActorHeaders` (`src/components/shared/actor-headers.tsx`) bọc `window.fetch` một lần ở layout gốc.
- Mọi request tới `/api/*` được gắn `x-actor-id` (id người dùng, chuỗi số) và `x-actor-name` (tên, **đã `encodeURIComponent`** vì header chỉ nhận ASCII; backend decode lại). Lấy từ session `ago_session` trong `localStorage`.
- Dùng để backend ghi nhật ký "ai làm gì". Do client tự khai nên chỉ mang tính tham khảo, không phải xác thực.
- Proxy chuyển tiếp hai header này nguyên trạng.

## Upload ảnh và file

- Ảnh template: `POST /api/templates/:id/image` với **body thô** `image/*` (không multipart, tối đa 5MB, `content-type` là mime của ảnh). Proxy chuyển nguyên byte.
- `GET /api/templates/:id/image` có thể trả: 404 text `Chưa có ảnh`, 302 sang URL storage, hoặc byte ảnh — dùng trực tiếp làm `src` của `<img>`, không `getJSON`.
- Import khách hàng (`POST /api/customers/import`) gửi dữ liệu đã đọc từ file Excel (xlsx) dạng JSON.

## Redirect

- Proxy dùng `redirect: "manual"`: 3xx (kèm `location`) trả nguyên cho trình duyệt. Callback OAuth Zalo (`/api/zalo/oauth/callback`) kết thúc bằng redirect về `/zalo-oa` của FE, nên `APP_BASE_URL` của backend phải là domain công khai của FE.

## Webhook và cron

- Webhook Meta/Zalo vào `/api/webhooks/*`: backend kiểm chữ ký trên byte gốc, vì vậy proxy không được sửa body. Zalo webhook luôn trả 200.
- Cron (`/api/cron/*`) do pinger/lịch gọi, không gọi từ giao diện, trừ nút "Làm mới token" ở màn Zalo OA.

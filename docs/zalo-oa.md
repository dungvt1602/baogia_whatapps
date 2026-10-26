# Kết nối Zalo OA — từng bước và vì sao

App dùng Zalo OA để (a) **báo người phụ trách** khi khách trả lời báo giá (màn "Kênh nhận", loại ZALO) và (b) **nhận tin** người dùng nhắn OA qua webhook (màn "Phản hồi"). Cả hai cần `access_token` hợp lệ; token Zalo chỉ sống 1–25 giờ nên **backend** tự làm mới.

> Phân vai: **mọi logic Zalo (PKCE, đổi code, làm mới token, webhook, gửi tin) nằm ở backend NestJS** (`baogia_be`, module `zalo`, `webhooks`, `cron`). Biến môi trường Zalo (`ZALO_*`, `APP_BASE_URL`) đặt ở **backend**, không đặt ở FE. FE chỉ có màn **Zalo OA** (`/zalo-oa`) để bấm kết nối và xem trạng thái; mọi lời gọi `/api/zalo/*`, `/api/webhooks/zalo` đi qua proxy FE tới backend.

## Sơ đồ tổng quan

```text
Bước 1: Tạo app trên developers.zalo.me, gắn OA   → ZALO_APP_ID + ZALO_SECRET_KEY (env backend)
Bước 2: Xin quyền "Gửi tin nhắn text"             → Zalo duyệt
Bước 3: Khai Callback URL trên Zalo = URL màn "Zalo OA" hiển thị (1 lần)
Bước 4: Màn "Zalo OA" → "Kết nối Zalo OA" → "Mở trang cấp quyền" → admin OA bấm Đồng ý
Bước 5: Zalo quay về /api/zalo/oauth/callback → backend đổi code lấy token → lưu DB
Bước 6: Backend tự làm mới token (job nền + lúc gửi tin + /api/cron/zalo-token)
Bước 7: Kích hoạt người nhận bằng mã 6 số
Bước 8: Xác thực domain + Webhook (Zalo gọi vào)
```

## Điều kiện triển khai (quan trọng)

- Backend phải với tới được từ Internet qua cùng domain Zalo gọi: **Callback URL** (`/api/zalo/oauth/callback`) và **Webhook URL** (`/api/webhooks/zalo`) phải đến được backend — qua proxy của FE (giữ domain FE) hoặc trực tiếp domain backend.
- Đặt `APP_BASE_URL` (env **backend**) = domain công khai của FE, để sau khi cấp quyền, backend redirect về `/zalo-oa` của FE. Nếu URL suy ra sai (sau proxy lạ) khai tay `ZALO_OAUTH_CALLBACK_URL`.
- Chỉ chạy **một** instance làm mới token / worker (ở backend), tránh dùng `refresh_token` song song.

## Bước 1 — Tạo ứng dụng, lấy App ID + Secret Key

[developers.zalo.me](https://developers.zalo.me), đăng nhập **admin của OA**. Tạo app loại **Official Account API**, gắn đúng OA. **Cài đặt** → lấy **App ID**, **Secret Key**. Điền vào env backend:

```env
ZALO_APP_ID=<App ID>
ZALO_SECRET_KEY=<Secret Key>
```

Vì sao: cặp này là "danh tính" của app khi lấy/làm mới token. Khởi động lại backend sau khi điền.

## Bước 2 — Xin quyền "Gửi tin nhắn text"

**API và Cấp quyền** → **Official Account API** → **Gửi tin nhắn** → bật **"Gửi tin nhắn text"**, chờ **"Đã được duyệt"**. Thiếu quyền thì token vẫn cấp được nhưng gửi tin bị từ chối. Đừng xin thừa quyền.

## Bước 3 — Khai Callback URL (1 lần)

Mở app → menu **Zalo OA** (admin) → mục **Cấu hình** có sẵn **Callback URL** dạng `https://<domain>/api/zalo/oauth/callback`. Dán vào developers.zalo.me → app → **Official Account** → **Đường dẫn yêu cầu cấp quyền** → **Official Account Callback Url** → **Cập nhật**.

Ô **Code Challenge** / **State** **không cần điền**: backend tự sinh cặp PKCE (`code_verifier` giữ bí mật, `code_challenge = BASE64URL(SHA256(code_verifier))`) và nhúng vào link cấp quyền; lúc đổi `code` gửi kèm `code_verifier` nên `code` bị lộ cũng vô dụng.

## Bước 4 — Cấp quyền

Màn **Zalo OA** → **Kết nối Zalo OA** → **Mở trang cấp quyền Zalo** (tab mới). Đăng nhập đúng **admin của OA**, bấm **Đồng ý**. Zalo chuyển hướng về `/api/zalo/oauth/callback?oa_id=…&code=…&state=…`; backend đổi code lấy token ngay (code dùng 1 lần, sống vài phút), lưu DB, rồi đưa về màn Zalo OA với thông báo "Đã kết nối".

**Chạy local / callback không trỏ về app được:** mở mục *"Đổi code bằng tay"*, copy `code` + `oa_id` trên thanh địa chỉ dán vào → **Đổi code lấy token** (`POST /api/zalo/oauth/exchange`, vẫn dùng đúng verifier đã cất).

## Bước 5 — Tự vận hành

Backend giữ logic làm mới token:

- Trước khi gửi tin: nếu `expires_at` còn **< 10 phút** (hoặc đã hết) → đổi `refresh_token` lấy cặp mới, ghi đè DB, dùng ngay.
- Job nền mỗi **5 phút** làm tương tự; kiểu kéo: `GET/POST /api/cron/zalo-token` (pinger gọi `/api/cron/process-sends` mỗi phút cũng kiểm tra tiện thể).
- Zalo báo `-216` (token hỏng) giữa chừng → ép làm mới 1 lần rồi gửi lại. Nhiều request cùng lúc chỉ 1 luồng gọi Zalo.
- `expires_in` Zalo trả về được tin nguyên (thực tế 90000 giây = 25 giờ).

Kiểm tra: màn Zalo OA hiện *Access token hết hạn lúc… (còn N phút)*, *Làm mới lần cuối*; nút **Làm mới token ngay** để thử; **Gửi thử** để kiểm tra token + quyền.

**Bootstrap từ env** (chỉ khi đã lấy token tay): đặt `ZALO_OA_REFRESH_TOKEN=<refresh_token>` ở backend; lần đầu chưa có dòng token trong DB thì backend tạo dòng đã hết hạn để lượt làm mới đầu chạy ngay. Sau đó **xoá biến này** vì Zalo đã vô hiệu refresh_token đó.

**Khi nào làm lại từ Bước 4:** refresh_token trong DB cũng chết (backend tắt quá lâu, admin thu hồi quyền, đổi Secret Key quên cập nhật). Dấu hiệu: màn báo *Token hết hạn* mà **Làm mới token ngay** lỗi; nhật ký lặp `ZALO_LAM_MOI_TOKEN FAILED`. Xử lý: **Kết nối lại**.

## Bước 6 — Kích hoạt Zalo cho người nhận (mã 6 số)

Zalo chỉ cho OA nhắn người **đã tương tác** với OA và cần `user_id` theo OA (không phải SĐT):

1. Trong app bấm **Ⓩ Kích hoạt Zalo** (dưới tên mình ở sidebar), hoặc admin vào **Người dùng** → cột **Zalo** → **Kích hoạt** → **Lấy mã kích hoạt**.
2. Backend cấp **mã 6 số**, sống 10 phút (`POST /api/users/:id/zalo/link-code`).
3. Người đó nhắn đúng mã cho OA trên Zalo cá nhân (chưa chat thì bấm Quan tâm).
4. Webhook nhận `user_send_text` = mã → backend gắn `sender.id` với tài khoản và **tự tạo kênh nhận ZALO**, OA trả lời "Đã kích hoạt". Modal trên web tự chuyển *Đã kích hoạt* (poll 3 giây).
5. Từ đó mọi phản hồi khách được báo về Zalo người đó. **Huỷ kích hoạt** (`DELETE /api/users/:id/zalo`) xoá liên kết + kênh nhận.

Cách cũ vẫn dùng được: admin thêm `user_id` ở màn *Kênh nhận* hoặc nút **+ Thêm làm kênh nhận** ở màn Zalo OA (danh sách *Người đã nhắn*).

## Bước 7 — Xác thực domain + Webhook

Zalo gọi `POST https://<domain>/api/webhooks/zalo` khi có người nhắn/quan tâm OA. Cần **domain thật** (Zalo từ chối tunnel tạm).

**Xác thực domain:** developers.zalo.me → **Xác thực domain** → ô **"Tiền tố URL"** → `https://<domain>` → **Xác thực**. Zalo cho tải file `zalo_verifier<mã>.html` → **đặt vào thư mục `public/` của FE** (Next.js phục vụ ở đường dẫn gốc; domain nào Zalo xác thực thì file phải được phục vụ từ chính domain đó). Đổi domain thì Zalo cấp file khác → thay file.

**Đăng ký Webhook URL:** mục **Webhook** → dán Webhook URL (màn Zalo OA hiển thị sẵn) → chọn `user_send_text` (thêm `user_send_image`, `follow` nếu muốn) → **Lưu**.

**Hai cái bẫy:**

- Secret ký webhook **khác** Secret Key app: trang Webhook có ô **"Secret Key"** riêng → đặt vào `ZALO_WEBHOOK_SECRET` (env backend). Nhầm với `ZALO_SECRET_KEY` thì mọi webhook bị coi sai chữ ký, không lỗi rõ. Bỏ trống = không kiểm chữ ký (chỉ dùng khi dev).
- Header `X-ZEvent-Signature` có tiền tố `mac=` (backend cắt trước khi so). Công thức: `SHA256(app_id + raw_body + timestamp + webhook_secret)` — tính trên **byte gốc**, nên proxy FE không được sửa body.

**Webhook luôn trả 200:** lúc bấm Lưu Zalo gửi request thử không kèm chữ ký hợp lệ; trả 401/403 là Zalo không lưu. Backend trả 200 cho mọi trường hợp; chữ ký sai thì không xử lý gì, chỉ ghi log.

**Kiểm tra:** nhắn 1 tin vào OA → màn **Phản hồi** hiện dòng kênh *Zalo*; màn **Zalo OA** mục *Người đã nhắn* hiện người đó; nếu người đó là kênh nhận thì nhận được tin báo.

## Tùy chọn — dùng chung token với hệ thống cũ (worker Go)

Backend hỗ trợ đọc token Zalo của hệ thống cũ thay vì tự cấp quyền: đặt `ZALO_TOKEN_SOURCE_DB_URL` (chỉ cần quyền SELECT) và, nếu cần chuyển tiếp webhook, `ZALO_WEBHOOK_FORWARD_URL` (chuyển nguyên văn raw body + `X-ZEvent-Signature`). Có `ZALO_TOKEN_SOURCE_DB_URL` thì bỏ qua cấp quyền/làm mới; màn Zalo OA hiện badge *Dùng chung token* và liệt kê người đã liên kết bên hệ thống cũ. Chi tiết xem tài liệu backend.

## Tham chiếu nhanh

| Thứ | Ở đâu |
|---|---|
| Màn hình | FE: `src/features/zalo/components/zalo-screen.tsx` → `/zalo-oa`; modal `zalo-activate-modal.tsx` |
| Endpoint Zalo | BE `zalo.controller.ts`: `/api/zalo/{status,check,disconnect,refresh,test,senders,shared-users}`, `/oauth/{start,exchange,callback}` |
| Webhook | BE `webhooks.controller.ts`: `/api/webhooks/zalo` |
| Kích hoạt | BE `users.controller.ts`: `/api/users/:id/zalo`, `/zalo/link-code` |
| Cron | BE `cron.controller.ts`: `/api/cron/zalo-token` |
| Env | `ZALO_APP_ID`, `ZALO_SECRET_KEY`, `ZALO_WEBHOOK_SECRET`, `APP_BASE_URL`, `ZALO_OAUTH_CALLBACK_URL` (tuỳ chọn) — đều ở backend |

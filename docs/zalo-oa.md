# Kết nối Zalo OA cho app báo giá — từng bước và vì sao

Bản cho app Next.js này, chuyển từ quy trình đã làm với worker Go (`zalo-deploy.md`).
Khác biệt lớn nhất: **các bước 3 → 7 (PKCE, đổi code, bootstrap .env) đã được tự động hoá
trong màn "Zalo OA"** của app — không còn phải chạy `openssl`/`curl` tay.

Bối cảnh: app dùng Zalo OA để (a) **báo sếp** khi khách trả lời báo giá (màn "Kênh nhận",
loại ZALO) và (b) **nhận tin** người dùng nhắn OA qua webhook (màn "Phản hồi"). Cả hai cần
`access_token` hợp lệ; token Zalo chỉ sống 1–25 giờ nên app có cơ chế **tự làm mới**
(`src/server/services/zaloTokenService.ts`), mirror `token_refresher.go` của worker.

---

## Sơ đồ tổng quan

```
Bước 1: Tạo app trên developers.zalo.me, gắn với OA → ZALO_APP_ID + ZALO_SECRET_KEY (.env)
Bước 2: Xin quyền "Gửi tin nhắn text"                    → Zalo duyệt
Bước 3: Khai Callback URL trên Zalo = URL màn "Zalo OA" hiển thị (1 lần)
Bước 4: Màn "Zalo OA" → "Kết nối Zalo OA" → "Mở trang cấp quyền" → admin OA bấm Đồng ý
Bước 5: Zalo tự quay về /api/zalo/oauth/callback → app đổi code lấy token → ghi zalo_oa_tokens
Bước 6: Từ đây app tự làm mới token mãi mãi (job 5 phút + lúc gửi tin + /api/cron/zalo-token)
Bước 7: Webhook: xác thực domain + khai URL + ZALO_WEBHOOK_SECRET
```

---

## Bước 0 — DÙNG CHUNG với worker Go (khuyên dùng khi worker Go đã chạy Zalo)

Worker Go đã cấp quyền một lần (Bước 1–7 của `zalo-deploy.md`) và đang giữ token trong bảng
`zalo_oa_tokens` của **DB Go**, tự làm mới mỗi 5 phút. Web này có DB riêng nên **không tự có
token** — nhưng thay vì cấp quyền lại (rủi ro giẫm chuỗi refresh_token của Go), cho web này
**đọc thẳng** token của Go:

```env
ZALO_TOKEN_SOURCE_DB_URL="postgresql://...connection string DB worker Go..."   # chỉ cần SELECT
ZALO_WEBHOOK_FORWARD_URL="https://ago-order-api.onrender.com/webhooks/zalo"   # xem dưới
```

- Có `ZALO_TOKEN_SOURCE_DB_URL` → web này **bỏ qua hoàn toàn** cấp quyền/làm mới; mỗi lần gửi tin
  đọc `access_token` mới nhất từ `zalo_oa_tokens` bên Go (cache 5 phút; Zalo báo `-216` thì đọc lại
  ngay vì Go vừa xoay token). `src/server/lib/zaloSharedToken.ts`.
- Màn **Zalo OA** hiện badge *Dùng chung token với worker Go*, ẩn nút Kết nối, và liệt kê
  **người đã liên kết Zalo bên Go** (`zalo_user_bindings`) → bấm **+ Thêm làm kênh nhận** là
  phản hồi khách bay về Zalo người đó — không cần webhook, không cần mã 6 số.
- **Webhook**: 1 app Zalo chỉ có 1 URL, hiện đang trỏ về Go. Chỉ khi cần luồng mã 6 số / nhận tin
  Zalo ở web này thì đổi URL webhook sang web này và đặt `ZALO_WEBHOOK_FORWARD_URL` = URL webhook
  của Go: web này chuyển tiếp **nguyên văn** (raw body + `X-ZEvent-Signature`) nên Go verify và xử
  lý y như cũ (cùng app → cùng webhook secret).
- Render Postgres cần `?sslmode=require`; DB Go trong docker đóng cổng thì không dùng được cách này.
- Muốn tách riêng sau này: bỏ `ZALO_TOKEN_SOURCE_DB_URL` → làm Bước 1–5 bên dưới.

---

## Bước 1 — Tạo ứng dụng, lấy App ID + Secret Key

Vào [developers.zalo.me](https://developers.zalo.me), đăng nhập bằng tài khoản **admin của OA**.
Tạo app loại **Official Account API**, gắn với đúng OA. **Cài đặt** → lấy **App ID** và
**Secret Key**. Điền vào `.env` (local) / Environment (Render):

```env
ZALO_APP_ID=<App ID>
ZALO_SECRET_KEY=<Secret Key>
```

**Vì sao:** cặp này là "danh tính" của app khi gọi Zalo — mọi lệnh lấy/làm mới token đều
phải chứng minh "tôi là app này". Khởi động lại app sau khi điền.

---

## Bước 2 — Xin quyền "Gửi tin nhắn text"

**API và Cấp quyền** → **Official Account API** → **Gửi tin nhắn** → bật **"Gửi tin nhắn
text"**. Chờ trạng thái **"Đã được duyệt"** (tự động hoặc 1–3 ngày).

**Vì sao:** app gọi `POST /v3.0/oa/message/cs` (`src/server/lib/zalo.ts`) — đúng quyền này.
Thiếu quyền thì token vẫn cấp được nhưng gửi tin bị từ chối (lỗi nghiệp vụ, không retry).
Đừng xin thừa quyền — duyệt lâu hơn vô ích.

---

## Bước 3 — Khai Callback URL (1 lần)

Mở app → menu **Zalo OA** (admin) → mục **Cấu hình** có sẵn **Callback URL**, dạng
`https://<domain-app>/api/zalo/oauth/callback`. Sao chép, dán vào developers.zalo.me →
app → **Official Account** → **Đường dẫn yêu cầu cấp quyền** → ô **Official Account
Callback Url** → **Cập nhật**.

Ô **Code Challenge** / **State** trên trang Zalo **không cần điền** — app tự sinh cặp PKCE
và nhúng sẵn vào link cấp quyền ở bước 4.

**Vì sao PKCE vẫn có:** app tạo `code_verifier` (bí mật, cất trong `app_settings`) và
`code_challenge = BASE64URL(SHA256(code_verifier))`; Zalo ghi nhớ challenge khi admin
đồng ý; lúc đổi `code` lấy token app gửi kèm `code_verifier`, Zalo tự hash và so — ai
nhặt được `code` mà không có verifier thì vô dụng. (Bẫy `\r` của `openssl` trên Git Bash
không còn vì tính bằng Node.)

Nếu deploy sau proxy lạ và URL suy ra sai, khai tay `ZALO_OAUTH_CALLBACK_URL` hoặc
`APP_BASE_URL` trong env.

---

## Bước 4 — Cấp quyền

Màn **Zalo OA** → **Kết nối Zalo OA** → hiện khung 2 bước → **Mở trang cấp quyền Zalo**
(tab mới). Đăng nhập đúng tài khoản **admin của OA**, bấm **Đồng ý**.

Zalo chuyển hướng về `/api/zalo/oauth/callback?oa_id=…&code=…&state=…`. App **đổi code
lấy token ngay** (code dùng 1 lần, sống vài phút), ghi vào bảng `zalo_oa_tokens`, ghi nhớ
`oa_id`, rồi đưa bạn về màn Zalo OA với thông báo "Đã kết nối".

**Chạy local / callback không trỏ về app được:** mở mục *"Đổi code bằng tay"* trong khung
đó, copy `code` + `oa_id` trên thanh địa chỉ dán vào → **Đổi code lấy token**. Vẫn dùng
đúng verifier đã cất nên PKCE không bị bỏ qua.

---

## Bước 5 — Từ đây tự vận hành

`zaloTokenService` giữ đúng logic worker Go:

- Trước khi gửi tin: đọc `expires_at` trong DB, còn **< 10 phút** (hoặc đã hết) → gọi Zalo
  đổi `refresh_token` lấy cặp mới, ghi đè DB, dùng ngay.
- Job nền mỗi **5 phút** (`src/instrumentation.ts`) làm y hệt → token không bao giờ có
  cơ hội hết hạn thật khi server đang chạy.
- Kiểu kéo: `/api/cron/process-sends` (pinger đã gọi mỗi phút) tiện thể kiểm luôn (tự giới
  hạn 1 lần đọc DB / 5 phút); hoặc gọi riêng `GET /api/cron/zalo-token`.
- Zalo báo `-216` (token hỏng) giữa chừng → ép làm mới 1 lần rồi gửi lại.
- Nhiều request cùng lúc chỉ 1 luồng gọi Zalo (refresh_token dùng 1 lần — gọi song song
  là luồng sau dùng token đã bị vô hiệu).

`expires_in` Zalo trả về (thực tế `90000` giây = 25 giờ) được tin nguyên — không hard-code.

**Kiểm tra:** màn Zalo OA hiện *Access token hết hạn lúc… (còn N phút)* và *Làm mới lần
cuối*; nút **Làm mới token ngay** để thử. Log server:

```
[zaloToken] đã làm mới access token Zalo OA oa_id=... expires_at=...
[zaloToken] job làm mới token Zalo OA chạy mỗi 5 phút
```

### Bootstrap từ `.env` (chỉ khi đã lấy token TAY bằng curl)

Đặt `ZALO_OA_REFRESH_TOKEN=<refresh_token>` rồi chạy app. Lần đầu **chưa có dòng nào**
trong `zalo_oa_tokens` → app tạo dòng với `expires_at = bây giờ` (coi như hết hạn) để lượt
làm mới đầu tiên chạy ngay. Log: `đã khởi tạo token Zalo OA từ ZALO_OA_REFRESH_TOKEN`.
Sau đó **xoá biến này** — Zalo đã vô hiệu refresh_token đó ngay lần dùng đầu, để lại chỉ
gây nhầm.

### Khi nào phải làm lại từ Bước 4

Chỉ khi **refresh_token trong DB cũng chết**: app tắt quá lâu (vài tháng), admin OA thu hồi
quyền, đổi Secret Key mà quên cập nhật env. Dấu hiệu: màn Zalo OA báo *Token hết hạn* mà
**Làm mới token ngay** lỗi; log `[zaloToken] làm mới token Zalo OA thất bại`; nhật ký có
`ZALO_LAM_MOI_TOKEN FAILED` lặp lại. Xử lý: **Kết nối lại (cấp quyền lại)**.

---

## Bước 6 — Kích hoạt Zalo cho người nhận (mã 6 số, giống nút "Kết nối" bên worker Go)

Zalo chỉ cho OA nhắn người **đã tương tác** với OA, và cần `user_id` theo OA (không phải
SĐT) — nên người nhận phải tự "đăng ký" bằng cách nhắn OA một lần:

1. Trong app, bấm **Ⓩ Kích hoạt Zalo** (nút dưới tên mình ở sidebar — ai cũng có), hoặc admin
   vào **Người dùng** → cột **Zalo** → **Kích hoạt** cho người khác → **Lấy mã kích hoạt**.
2. App cấp **mã 6 số** (sống 10 phút, bảng `zalo_link_requests`).
3. Người đó mở Zalo cá nhân, tìm OA, **nhắn đúng mã** cho OA (chưa từng chat thì bấm Quan tâm).
4. Webhook (bước 7) nhận `user_send_text` = mã → `consumeZaloLinkCode`: gắn `sender.id` với tài
   khoản (`zalo_user_bindings`), **tự tạo kênh nhận ZALO** (`receive_channels`, tên "Zalo — <họ tên>"),
   xoá mã, OA trả lời "✅ Đã kích hoạt…". Modal trên web tự chuyển sang *Đã kích hoạt* (poll 3s).
5. Từ đó `notifyInboundReply` (đã có sẵn cho WhatsApp) gửi mọi phản hồi khách về Zalo người đó.
   **Huỷ kích hoạt** xoá binding + kênh nhận. Tin của nhân viên đã kích hoạt nhắn OA không bị
   coi là phản hồi khách.

Cách cũ (admin tự thêm `user_id` ở màn *Kênh nhận* / nút **+ Thêm làm kênh nhận** ở màn Zalo OA)
vẫn dùng được. Nút **Gửi thử** ở màn Zalo OA để kiểm tra token + quyền.

Code: `src/server/services/zaloLinkService.ts`, `src/features/zalo/ZaloActivateModal.tsx`,
`GET/DELETE /api/users/{id}/zalo`, `POST /api/users/{id}/zalo/link-code`.

---

## Bước 7 — Xác thực domain + Webhook (Zalo gọi vào)

Chiều ngược lại: Zalo gọi `POST https://<domain-app>/api/webhooks/zalo` khi có người nhắn
/ quan tâm OA. Cần **domain thật** (Zalo từ chối tunnel tạm).

### 7.1 Xác thực domain

developers.zalo.me → app → **Xác thực domain** → ô **"Tiền tố URL"** (không phải ô
Domain cần DNS TXT) → điền `https://<domain-app>` → **Xác thực**. Zalo cho tải file
`zalo_verifier<mã>.html` → **bỏ nguyên file vào thư mục `public/`** của app → commit +
deploy. Next.js phục vụ file tĩnh trong `public/` ở đúng đường dẫn gốc, không cần route
riêng. Đổi domain / xác thực lại → Zalo cấp file khác → thay file.

### 7.2 Đăng ký Webhook URL

Mục **Webhook** → dán **Webhook URL** (màn Zalo OA hiển thị sẵn) → chọn sự kiện
`user_send_text` (thêm `user_send_image`, `follow`… nếu muốn) → **Lưu**. Zalo cảnh báo IP
server không ở Việt Nam thì cứ đồng ý — các trường cần dùng không bị rút gọn.

### 7.3 Hai cái bẫy (đã gặp thật)

**(a) Secret ký webhook KHÁC Secret Key app.** Trang Webhook có ô **"Secret Key"** riêng →
đặt vào `ZALO_WEBHOOK_SECRET`. Nhầm với `ZALO_SECRET_KEY` = mọi webhook bị coi là sai chữ
ký, không lỗi rõ, chỉ thấy "im lặng". Log server khi sai: `[zaloWebhook] chữ ký không hợp
lệ`. (Bỏ trống `ZALO_WEBHOOK_SECRET` = không kiểm chữ ký — chỉ dùng khi dev.)

**(b) Header `X-ZEvent-Signature` có tiền tố `mac=`** → app cắt trước khi so
(`verifyZaloSignature` trong `src/server/lib/zalo.ts`). Công thức:
`SHA256(app_id + raw_body + timestamp + webhook_secret)`.

### 7.4 Webhook LUÔN trả 200

Lúc bấm Lưu, Zalo gửi request thử **không kèm chữ ký hợp lệ**. Trả 401/403 là Zalo báo
*"Webhook chỉ được thiết lập khi trả về HTTP code 200 OK"* và không lưu. Handler
`src/app/api/webhooks/zalo/route.ts` trả 200 cho **mọi** trường hợp — chữ ký sai thì
**không xử lý gì** (không lưu tin, không báo sếp), chỉ log. An toàn giữ nguyên, chỉ tầng
HTTP không báo lỗi ra ngoài.

### 7.5 Kiểm tra toàn luồng

1. Nhắn 1 tin vào OA từ Zalo cá nhân.
2. Màn **Phản hồi** hiện dòng kênh *Zalo*, tên hiển thị + `user_id`; màn **Zalo OA** mục
   *Người đã nhắn* hiện người đó.
3. Nếu người đó đã là kênh nhận → sếp nhận được tin báo (nội dung 4 dòng như WhatsApp).

---

## Tham chiếu nhanh

| Thứ | Ở đâu |
|---|---|
| Token + PKCE + làm mới | `src/server/services/zaloTokenService.ts` |
| Gửi tin OA, verify chữ ký | `src/server/lib/zalo.ts` |
| Webhook | `src/app/api/webhooks/zalo/route.ts` |
| OAuth start / callback / đổi code tay | `src/app/api/zalo/oauth/{start,callback,exchange}` |
| Trạng thái / làm mới / gửi thử / ngắt | `src/app/api/zalo/{status,refresh,test,disconnect}` |
| Người đã nhắn OA | `src/app/api/zalo/senders` ← `zaloSenderService.ts` |
| Kích hoạt Zalo (mã 6 số) | `zaloLinkService.ts`, `ZaloActivateModal.tsx`, `/api/users/{id}/zalo[/link-code]` |
| Dùng chung token / người liên kết bên Go | `src/server/lib/zaloSharedToken.ts`, `GET /api/zalo/shared-users` |
| Chuyển tiếp webhook sang Go | `forwardZaloWebhook` trong `src/server/lib/zalo.ts` (`ZALO_WEBHOOK_FORWARD_URL`) |
| Cron kéo | `GET /api/cron/zalo-token` (và `/api/cron/process-sends` tiện thể) |
| Màn hình | `src/features/zalo/ZaloScreen.tsx` → `/zalo-oa` |
| Bảng | `zalo_oa_tokens` (token), `zalo_user_bindings` + `zalo_link_requests` (kích hoạt), `app_settings` (`zalo_oa_id`, `zalo_pkce_*`) |
| SQL tạo bảng (Supabase SQL Editor) | cuối `prisma/schema.sql` |

import { NextRequest, NextResponse } from "next/server";
import { recordInbound } from "@/server/services/inboundService";
import { notifyInboundReply } from "@/server/services/notificationService";
import { verifyZaloSignature, getZaloProfile, sendZaloTo, forwardZaloWebhook } from "@/server/lib/zalo";
import { captureZaloOaId, markZaloWebhookSeen } from "@/server/services/zaloTokenService";
import { consumeZaloLinkCode, isLinkedZaloUser } from "@/server/services/zaloLinkService";

// Webhook Zalo OA (Zalo gọi vào). Khai ở developers.zalo.me -> app -> Webhook:
//   URL: https://<domain>/api/webhooks/zalo
//   Sự kiện: user_send_text (+ user_send_image/sticker/file... nếu muốn), follow
// Chữ ký: X-ZEvent-Signature = "mac=" + SHA256(app_id + body + timestamp + WebhookSecret)
//   -> secret là ô "Secret Key" TRONG TRANG WEBHOOK (ZALO_WEBHOOK_SECRET), KHÁC Secret Key app.
//
// LUÔN TRẢ 200 cho MỌI trường hợp (chữ ký sai, payload lỗi, sự kiện lạ...):
//   lúc bấm Lưu webhook, Zalo gửi 1 request thử KHÔNG kèm chữ ký hợp lệ — trả khác 200 là Zalo
//   báo "Webhook chỉ được thiết lập khi trả về HTTP code 200 OK" và từ chối lưu URL.
//   An toàn vẫn giữ: chữ ký sai thì KHÔNG xử lý gì (không lưu tin, không báo sếp), chỉ log.

export const dynamic = "force-dynamic";

// Zalo không dùng hub.challenge; GET chỉ để kiểm tra endpoint sống.
export async function GET() {
  return new NextResponse("ok", { status: 200 });
}

// Tóm tắt nội dung theo loại sự kiện Zalo.
function summarizeZalo(eventName: string, message: Record<string, unknown>): string {
  if (eventName === "user_send_text") return String(message?.text || "");
  if (eventName === "user_send_image") return "[Ảnh]";
  if (eventName === "user_send_sticker") return "[Sticker]";
  if (eventName === "user_send_file") return "[Tệp]";
  if (eventName === "user_send_gif") return "[GIF]";
  if (eventName === "user_send_audio") return "[Âm thanh]";
  if (eventName === "user_send_video") return "[Video]";
  if (eventName === "user_send_location") return "[Vị trí]";
  if (eventName === "user_send_link") return String(message?.text || "[Liên kết]");
  return String(message?.text || `[${eventName}]`);
}

export async function POST(req: NextRequest) {
  // Đọc RAW body để verify chữ ký (không parse trước).
  const raw = await req.text();
  const mac = req.headers.get("x-zevent-signature");
  // Dùng chung app Zalo với worker Go -> chuyển tiếp MỌI sự kiện (kể cả request thử) sang bên đó.
  forwardZaloWebhook(raw, mac);

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true }); // request thử kết nối / payload lạ -> 200, không làm gì
  }

  const timestamp = String(body?.timestamp || "");
  if (!verifyZaloSignature(raw, timestamp, mac)) {
    console.warn("[zaloWebhook] chữ ký không hợp lệ — bỏ qua (kiểm ZALO_WEBHOOK_SECRET có đúng ô Secret Key ở trang Webhook không)");
    return NextResponse.json({ ok: true }); // vẫn 200 (xem chú thích đầu file)
  }

  void markZaloWebhookSeen(); // chữ ký đúng -> webhook thật sự đang trỏ về web này

  try {
    const eventName = String(body?.event_name || "");
    const sender = (body?.sender || {}) as Record<string, unknown>;
    const recipient = (body?.recipient || {}) as Record<string, unknown>;
    const message = (body?.message || {}) as Record<string, unknown>;

    // recipient.id = OA id (với sự kiện user gửi tới OA) -> ghi nhớ để màn Zalo OA hiển thị.
    if (eventName.startsWith("user_")) await captureZaloOaId(String(recipient?.id || ""));

    if (eventName.startsWith("user_send")) {
      // Tin do USER gửi tới OA (bỏ qua oa_send... để không lưu rác).
      const uid = String(sender?.id || "");
      const msgId = String(message?.msg_id || "") || null;

      if (uid) {
        const fromName = await getZaloProfile(uid); // tên hiển thị (webhook không có SĐT)

        // MÃ KÍCH HOẠT (6 số) do người dùng app nhắn vào OA -> gắn Zalo với tài khoản, trả lời xác nhận,
        // KHÔNG lưu thành phản hồi khách / không báo sếp.
        if (eventName === "user_send_text") {
          const linked = await consumeZaloLinkCode(String(message?.text || ""), uid, fromName);
          if (linked) {
            await sendZaloTo(uid, `✅ Đã kích hoạt Zalo cho tài khoản ${linked.name} (${linked.username}). Từ giờ phản hồi của khách hàng sẽ được báo về đây.`);
            return NextResponse.json({ ok: true });
          }
        }
        // Nhân viên đã kích hoạt nhắn OA (không phải khách) -> không lưu Phản hồi, không báo sếp.
        if (await isLinkedZaloUser(uid)) return NextResponse.json({ ok: true });

        const saved = await recordInbound({
          waMessageId: msgId, // dùng làm khoá chống trùng
          fromPhone: uid, // Zalo: lưu UID vào đây
          fromName,
          channel: "ZALO",
          kind: "message",
          type: eventName,
          text: summarizeZalo(eventName, message),
          raw: body,
        });
        if (saved) await notifyInboundReply(saved);
      }
    } else if (eventName === "follow") {
      // Người dùng quan tâm OA -> lưu 1 dòng để admin thấy user_id, tiện thêm làm kênh nhận.
      const uid = String((body?.follower as Record<string, unknown> | undefined)?.id || "");
      if (uid) {
        const fromName = await getZaloProfile(uid);
        await recordInbound({
          waMessageId: `zalo-follow-${uid}-${timestamp}`,
          fromPhone: uid,
          fromName,
          channel: "ZALO",
          kind: "message",
          type: "follow",
          text: "[Đã quan tâm OA]",
          raw: body,
        });
      }
    }
  } catch (err) {
    console.error("[zaloWebhook] error:", err);
  }

  return NextResponse.json({ ok: true });
}

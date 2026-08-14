import { NextRequest, NextResponse } from "next/server";
import { recordInbound } from "@/server/services/inboundService";
import { notifyInboundReply } from "@/server/services/notificationService";
import { verifyZaloSignature, getZaloProfile } from "@/server/lib/zalo";

// Webhook Zalo OA (Zalo gọi vào). Khai ở Zalo Developers -> app -> Webhook:
//   URL: https://<domain>/api/webhooks/zalo
//   Sự kiện: user_send_text (+ user_send_image/sticker... nếu muốn)
// Verify chữ ký bằng ZALO_OA_SECRET + ZALO_APP_ID.

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
  if (eventName === "user_send_link") return String(message?.text || "[Liên kết]");
  return String(message?.text || `[${eventName}]`);
}

export async function POST(req: NextRequest) {
  // Đọc RAW body để verify chữ ký (không parse trước).
  const raw = await req.text();
  const mac = req.headers.get("x-zevent-signature");

  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const timestamp = String(body?.timestamp || "");
  if (!verifyZaloSignature(raw, timestamp, mac)) {
    console.warn("[zaloWebhook] chữ ký không hợp lệ — bỏ qua");
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  try {
    const eventName = String(body?.event_name || "");
    // Chỉ xử lý tin do USER gửi tới OA (bỏ qua follow, oa_send... để không lưu rác).
    if (eventName.startsWith("user_send")) {
      const sender = (body?.sender || {}) as Record<string, unknown>;
      const message = (body?.message || {}) as Record<string, unknown>;
      const uid = String(sender?.id || "");
      const msgId = String(message?.msg_id || "") || null;

      if (uid) {
        const fromName = await getZaloProfile(uid); // tên hiển thị (webhook không có SĐT)
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
    }
  } catch (err) {
    console.error("[zaloWebhook] error:", err);
  }

  return NextResponse.json({ ok: true });
}

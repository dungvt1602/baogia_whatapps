import { NextRequest, NextResponse } from "next/server";
import { recordInbound, summarizeMessage, updateDeliveryStatus } from "@/server/services/inboundService";
import { notifyInboundReply } from "@/server/services/notificationService";
import { findReceiveChannelId } from "@/server/services/receiveChannelService";

// Webhook WhatsApp (Meta gọi vào). Cần URL public + khai ở Meta App Dashboard:
//   Callback URL: https://<domain>/api/webhooks/whatsapp
//   Verify token: đúng bằng biến môi trường WHATSAPP_VERIFY_TOKEN
//   Subscribe field: messages

export const dynamic = "force-dynamic";

// Bước xác minh của Meta: trả lại hub.challenge nếu verify_token khớp.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const mode = sp.get("hub.mode");
  const token = sp.get("hub.verify_token");
  const challenge = sp.get("hub.challenge") || "";
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || "";

  if (mode === "subscribe" && expected && token === expected) {
    return new NextResponse(challenge, { status: 200, headers: { "content-type": "text/plain" } });
  }
  return new NextResponse("forbidden", { status: 403 });
}

// Nhận sự kiện: tin nhắn khách trả lời + trạng thái gửi.
// LUÔN trả 200 để Meta không gửi lại dồn dập; lỗi xử lý nuốt vào log.
export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: true });
  }

  try {
    const entries = Array.isArray((body as { entry?: unknown[] }).entry) ? (body as { entry: unknown[] }).entry : [];
    for (const entry of entries) {
      const changes = Array.isArray((entry as { changes?: unknown[] }).changes) ? (entry as { changes: unknown[] }).changes : [];
      for (const change of changes) {
        const value = ((change as { value?: unknown }).value || {}) as Record<string, unknown>;

        // Kênh nhận: khớp theo phone_number_id của Meta (số nào đã nhận tin này). Không khớp -> null.
        const metadata = (value.metadata || {}) as Record<string, unknown>;
        const receiveChannelId = await findReceiveChannelId("WHATSAPP", String(metadata.phone_number_id || ""));

        // Trạng thái gửi: sent/delivered/read/failed -> cập nhật send_jobs theo messageId.
        const statuses = Array.isArray(value.statuses) ? (value.statuses as Record<string, unknown>[]) : [];
        for (const st of statuses) {
          const id = String(st?.id || "");
          const status = String(st?.status || "");
          if (id && status) await updateDeliveryStatus(id, status);
        }

        // Tin khách gửi đến (trả lời / bấm nút Flow).
        const messages = Array.isArray(value.messages) ? (value.messages as Record<string, unknown>[]) : [];
        for (const m of messages) {
          const s = summarizeMessage(m);
          const saved = await recordInbound({
            waMessageId: String(m?.id || "") || null,
            fromPhone: String(m?.from || ""),
            kind: s.kind,
            type: s.type,
            text: s.text,
            raw: m,
            receiveChannelId,
          });
          // Tin MỚI (không trùng) -> báo sếp qua Zalo (no-op nếu chưa cấu hình; không ném lỗi).
          if (saved) await notifyInboundReply(saved);
        }
      }
    }
  } catch (err) {
    console.error("[whatsappWebhook] error:", err);
  }

  return NextResponse.json({ ok: true });
}

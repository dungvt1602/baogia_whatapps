import { NextRequest, NextResponse } from "next/server";
import { recordInbound, summarizeMessage, updateDeliveryStatus } from "@/server/services/inboundService";
import { notifyInboundReply } from "@/server/services/notificationService";

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

        // Trạng thái gửi: sent/delivered/read/failed -> cập nhật send_jobs theo messageId.
        const statuses = Array.isArray(value.statuses) ? (value.statuses as Record<string, unknown>[]) : [];
        for (const st of statuses) {
          const id = String(st?.id || "");
          const status = String(st?.status || "");
          // Khi failed: lấy lý do Meta báo (code + chi tiết) để lưu vào send_jobs.error.
          let errText: string | null = null;
          const errs = Array.isArray(st?.errors) ? (st.errors as Record<string, unknown>[]) : [];
          if (status === "failed" && errs.length) {
            const e = errs[0] as { code?: unknown; title?: unknown; message?: unknown; error_data?: { details?: unknown } };
            const detail = e.error_data?.details || e.message || "";
            errText = `[${e.code ?? "?"}] ${e.title ?? ""}${detail ? " — " + detail : ""}`.trim();
          }
          if (id && status) await updateDeliveryStatus(id, status, errText);
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
          });
          // Tin MỚI (không trùng) -> báo sếp (đọc kênh nhận từ DB; no-op nếu chưa cấu hình).
          if (saved) await notifyInboundReply(saved);
        }
      }
    }
  } catch (err) {
    console.error("[whatsappWebhook] error:", err);
  }

  return NextResponse.json({ ok: true });
}

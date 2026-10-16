import { NextRequest, NextResponse } from "next/server";
import { recordInbound, summarizeMessage, updateDeliveryStatus } from "@/server/services/inboundService";
import { notifyInboundReply } from "@/server/services/notificationService";
import { maybeAutoReply } from "@/server/services/autoReplyService";
import { captureWabaId } from "@/server/services/metaSyncService";
import { forwardToTracking, isTrackingButtonMessage, trackingForwardUrl } from "@/server/lib/trackingWebhook";

// Webhook WhatsApp (Meta gọi vào). Cần URL public + khai ở Meta App Dashboard:
//   Callback URL: https://<domain>/api/webhooks/whatsapp
//   Verify token: đúng bằng biến môi trường WHATSAPP_VERIFY_TOKEN
//   Subscribe field: messages
//
// Dùng chung app Meta với hệ thống THEO DÕI ĐƠN HÀNG (1 app chỉ có 1 Callback URL): nút "Confirm Goods
// Received" của hệ thống đó được CHUYỂN TIẾP nguyên văn (xem lib/trackingWebhook.ts, biến
// WHATSAPP_WEBHOOK_FORWARD_URL) và KHÔNG đi vào luồng lưu/báo sếp/tự trả lời của web này.

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
  // RAW body: phải giữ nguyên từng byte — chính chuỗi này được ký (X-Tracking-Signature) rồi chuyển sang
  // hệ thống theo dõi đơn, nên không được parse/stringify lại trước khi chuyển.
  const raw = await req.text();
  let body: unknown = {};
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: true });
  }

  const forwardEnabled = !!trackingForwardUrl();
  let hasTrackingButton = false;

  try {
    const entries = Array.isArray((body as { entry?: unknown[] }).entry) ? (body as { entry: unknown[] }).entry : [];
    for (const entry of entries) {
      // entry.id = WABA ID -> tự lưu lại để tính năng "Đồng bộ Meta" dùng (không cần khai tay).
      await captureWabaId(String((entry as { id?: unknown }).id || ""));
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

        // Tên hiển thị WhatsApp của người gửi (pushname) -> khách lạ cũng có tên để chào.
        const contacts = Array.isArray(value.contacts) ? (value.contacts as Record<string, unknown>[]) : [];
        const profileName = String((contacts[0]?.profile as Record<string, unknown> | undefined)?.name || "");

        // Tin khách gửi đến (trả lời / bấm nút Flow).
        const messages = Array.isArray(value.messages) ? (value.messages as Record<string, unknown>[]) : [];
        for (const m of messages) {
          // Nút của hệ thống theo dõi đơn: chuyển tiếp ở cuối, không lưu / không báo sếp / không tự trả lời.
          if (forwardEnabled && isTrackingButtonMessage(m)) {
            hasTrackingButton = true;
            continue;
          }
          const s = summarizeMessage(m);
          const saved = await recordInbound({
            waMessageId: String(m?.id || "") || null,
            fromPhone: String(m?.from || ""),
            fromName: profileName || null,
            kind: s.kind,
            type: s.type,
            text: s.text,
            raw: m,
          });
          if (saved) {
            // Tin MỚI (không trùng) -> báo sếp + TRẢ LỜI TỰ ĐỘNG bằng template (nếu bật).
            await notifyInboundReply(saved);
            await maybeAutoReply(saved);
          }
        }
      }
    }
  } catch (err) {
    console.error("[whatsappWebhook] error:", err);
  }

  // Chuyển tiếp SAU xử lý cục bộ để lỗi bên này không làm mất xác nhận của khách.
  // Lỗi mạng / hết giờ / 5xx -> trả 503 để Meta gửi lại (tin khác trong cùng body đã idempotent theo
  // waMessageId). Bên kia từ chối (4xx, vd sai chữ ký) thì gửi lại vô ích -> vẫn 200.
  if (hasTrackingButton && (await forwardToTracking(raw)) === "retry") {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}

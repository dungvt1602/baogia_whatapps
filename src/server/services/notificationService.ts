import "server-only";
import { sendZaloText } from "@/server/lib/zalo";

// Thông báo nội bộ khi có sự kiện (hiện: phản hồi khách mới -> báo sếp qua Zalo).
// Provider hiện tại: Zalo OA. Muốn thêm kênh khác (Telegram...) thì bổ sung ở đây.

type InboundLike = {
  fromPhone: string;
  kind: string; // "message" | "flow_response"
  text: string | null;
  customer?: { name: string; company: string | null } | null;
};

// Soạn nội dung báo sếp từ 1 phản hồi khách.
function formatReply(msg: InboundLike): string {
  const who = msg.customer?.name
    ? `${msg.customer.name}${msg.customer.company ? ` (${msg.customer.company})` : ""}`
    : `SĐT ${msg.fromPhone}`;
  const flag = msg.kind === "flow_response" ? "[Bấm nút Flow] " : "";
  const body = (msg.text || "").trim() || "(không có nội dung)";
  return `📩 Phản hồi mới từ ${who}\n${flag}${body}`;
}

// Báo sếp qua Zalo khi có phản hồi khách mới.
// KHÔNG BAO GIỜ ném lỗi — được gọi trong webhook, lỗi ở đây không được phá luồng lưu tin / trả 200.
export async function notifyInboundReply(msg: InboundLike): Promise<void> {
  try {
    const r = await sendZaloText(formatReply(msg));
    if (r.skipped) {
      console.warn(
        "[notify] Zalo chưa cấu hình (ZALO_OA_TOKEN_MAIN / ZALO_BOSS_USER_ID) — bỏ qua báo sếp.",
      );
    }
  } catch (err) {
    console.error("[notify] báo sếp lỗi:", err);
  }
}

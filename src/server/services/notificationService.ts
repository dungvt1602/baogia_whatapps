import "server-only";
import { sendZaloText, isZaloConfigured } from "@/server/lib/zalo";
import { sendTelegramText, isTelegramConfigured } from "@/server/lib/telegram";

// Thông báo nội bộ khi có sự kiện (hiện: phản hồi khách mới -> báo sếp).
// Provider: Telegram (giống bot cũ) + Zalo OA. Kênh nào có cấu hình thì gửi kênh đó.

type InboundLike = {
  fromPhone: string;
  fromName?: string | null; // tên hiển thị (Zalo)
  channel?: string;
  kind: string; // "message" | "flow_response"
  text: string | null;
  customer?: { name: string; company: string | null; market: string | null } | null;
};

// Chuẩn hoá tên field Flow (bỏ tiền tố screen_N_ và hậu tố _N) để dò biến linh hoạt.
function normKey(v: string): string {
  return String(v || "")
    .toLowerCase()
    .replace(/screen_\d+_/g, "")
    .replace(/_\d+$/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function pickFlow(obj: Record<string, unknown>, names: string[]): string {
  const wanted = names.map(normKey);
  for (const [k, val] of Object.entries(obj)) {
    if (k === "flow_token") continue;
    if (wanted.some((w) => normKey(k).includes(w))) {
      const s = String(val ?? "").trim();
      if (s) return s;
    }
  }
  return "";
}
// Flow (khách bấm nút đặt lịch) -> 1 dòng: sản phẩm, số lượng, số container, cảng.
function formatFlowReply(text: string | null): string {
  let data: Record<string, unknown> = {};
  try {
    data = JSON.parse(text || "{}") as Record<string, unknown>;
  } catch {
    return (text || "").trim() || "(khách gửi form đặt lịch)";
  }
  const product = pickFlow(data, ["Name_of_product", "product", "san_pham"]);
  const qty = pickFlow(data, ["Quatity", "Quantity", "quantity", "so_luong"]);
  const container = pickFlow(data, ["container", "so_container", "number_of_container"]);
  const dest = pickFlow(data, ["Destination_port", "destination", "cang"]);
  const note = pickFlow(data, ["Note", "note", "ghi_chu"]);
  // Mỗi mục 1 dòng cho dễ đọc; mục nào trống thì bỏ.
  const lines: string[] = [];
  if (product) lines.push(`• Sản phẩm: ${product}`);
  if (qty) lines.push(`• Số lượng: ${qty}`);
  if (container) lines.push(`• Số container: ${container}`);
  if (dest) lines.push(`• Cảng đến: ${dest}`);
  if (note) lines.push(`• Ghi chú: ${note}`);
  return lines.length ? `Đặt hàng qua Flow\n${lines.join("\n")}` : "(khách gửi form đặt lịch qua Flow)";
}

// Soạn nội dung báo sếp từ 1 phản hồi khách (mẫu 4 dòng).
function formatReply(msg: InboundLike): string {
  const name = msg.customer?.name || msg.fromName || "(chưa rõ)";
  const phone = msg.fromPhone || "-";
  const company = msg.customer?.company || "-";
  const qg = msg.customer?.market || "-";
  const isFlow = msg.kind === "flow_response";
  const reply = isFlow
    ? formatFlowReply(msg.text)
    : (msg.text || "").trim() || "(không có nội dung)";
  return [
    `📩 Phản hồi từ: ${name} - ${phone}`,
    `CTY: ${company} - QG: ${qg}`,
    `Type: ${isFlow ? "flow" : "text"}`,
    `Reply: ${reply}`,
  ].join("\n");
}

// Báo sếp khi có phản hồi khách mới — gửi qua MỌI kênh đã cấu hình (Telegram + Zalo).
// KHÔNG BAO GIỜ ném lỗi — được gọi trong webhook, lỗi ở đây không được phá luồng lưu tin / trả 200.
export async function notifyInboundReply(msg: InboundLike): Promise<void> {
  const text = formatReply(msg);
  // Chạy song song, độc lập; 1 kênh lỗi không ảnh hưởng kênh kia.
  await Promise.allSettled([
    (async () => {
      try {
        await sendTelegramText(text);
      } catch (err) {
        console.error("[notify] Telegram lỗi:", err);
      }
    })(),
    (async () => {
      try {
        await sendZaloText(text);
      } catch (err) {
        console.error("[notify] Zalo lỗi:", err);
      }
    })(),
  ]);
  if (!isTelegramConfigured() && !isZaloConfigured()) {
    console.warn("[notify] Chưa cấu hình kênh báo sếp nào (Telegram/Zalo) — bỏ qua.");
  }
}

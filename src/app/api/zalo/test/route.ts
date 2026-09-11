import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { sendZaloTo } from "@/server/lib/zalo";
import { audit } from "@/server/services/auditService";

// Gửi thử 1 tin text tới user_id / SĐT Zalo (người đó phải đã Quan tâm OA).
// Để kiểm tra token còn sống + quyền "Gửi tin nhắn text" đã được duyệt.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { userId?: string; text?: string };
    const userId = (body.userId || "").trim();
    if (!userId) throw new Error("Nhập user_id / SĐT người nhận.");
    const r = await sendZaloTo(userId, (body.text || "").trim() || "✅ AGO báo giá: kết nối Zalo OA thành công.");
    if (r.skipped) throw new Error("Chưa có token Zalo OA — hãy kết nối Zalo OA trước.");
    await audit(req, { action: "ZALO_GUI_THU", target: userId, result: r.ok ? "SUCCESS" : "FAILED", note: r.ok ? null : r.error || "gửi lỗi" });
    if (!r.ok) throw new Error(r.error || "Gửi lỗi");
    return { ok: true };
  });
}

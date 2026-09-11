import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { sendZaloTo } from "@/server/lib/zalo";

// Gửi thử 1 tin text tới user_id (người đó phải đã nhắn/quan tâm OA).
// Để kiểm tra token còn sống + quyền "Gửi tin nhắn text" đã được duyệt.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { userId?: string; text?: string };
    const userId = (body.userId || "").trim();
    if (!userId) throw new Error("Nhập user_id người nhận.");
    const r = await sendZaloTo(userId, (body.text || "").trim() || "✅ AGO báo giá: kết nối Zalo OA thành công.");
    if (r.skipped) throw new Error("Chưa có token Zalo OA — hãy kết nối Zalo OA trước.");
    if (!r.ok) throw new Error(r.error || "Gửi lỗi");
    return { ok: true };
  });
}

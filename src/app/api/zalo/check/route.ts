import { handle } from "@/server/http/json";
import { checkZaloConnection } from "@/server/services/zaloTokenService";
import { audit } from "@/server/services/auditService";

// Nút "Kiểm tra kết nối" ở màn Zalo OA: gọi Zalo thật (đọc thông tin OA), không gửi tin gì.
export async function POST(req: Request) {
  return handle(async () => {
    const r = await checkZaloConnection();
    await audit(req, { action: "ZALO_KIEM_TRA", target: r.oaName || r.oaId || "OA", result: r.ok ? "SUCCESS" : "FAILED", note: r.ok ? null : r.error || null });
    if (!r.ok) throw new Error(r.error || "Kết nối lỗi");
    return r;
  });
}

import { handle } from "@/server/http/json";
import { checkZaloConnection } from "@/server/services/zaloTokenService";

// Nút "Kiểm tra kết nối" ở màn Zalo OA: gọi Zalo thật (đọc thông tin OA), không gửi tin gì.
export async function POST() {
  return handle(async () => {
    const r = await checkZaloConnection();
    if (!r.ok) throw new Error(r.error || "Kết nối lỗi");
    return r;
  });
}

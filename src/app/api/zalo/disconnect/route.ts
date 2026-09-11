import { handle } from "@/server/http/json";
import { disconnectZalo } from "@/server/services/zaloTokenService";

// Xoá token khỏi DB (đổi OA khác / app khác / thu hồi). Muốn dùng lại phải kết nối lại từ đầu.
export async function POST() {
  return handle(async () => {
    await disconnectZalo();
    return { ok: true };
  });
}

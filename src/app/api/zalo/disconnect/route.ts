import { handle } from "@/server/http/json";
import { disconnectZalo } from "@/server/services/zaloTokenService";
import { actorFromRequest } from "@/server/services/auditService";

// Xoá token khỏi DB (đổi OA khác / app khác / thu hồi). Muốn dùng lại phải kết nối lại từ đầu.
export async function POST(req: Request) {
  return handle(async () => {
    await disconnectZalo(actorFromRequest(req));
    return { ok: true };
  });
}

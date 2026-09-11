import { handle } from "@/server/http/json";
import { forceRefreshZaloToken } from "@/server/services/zaloTokenService";

// Ép làm mới access token ngay (không đợi job 5 phút). Trả hạn mới; KHÔNG trả token.
export async function POST() {
  return handle(async () => {
    const r = await forceRefreshZaloToken();
    return { oaId: r.oaId, expiresAt: r.expiresAt, updatedAt: r.updatedAt };
  });
}

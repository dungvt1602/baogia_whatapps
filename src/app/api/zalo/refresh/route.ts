import { handle } from "@/server/http/json";
import { forceRefreshZaloToken } from "@/server/services/zaloTokenService";
import { actorFromRequest } from "@/server/services/auditService";

// Ép làm mới access token ngay (không đợi job 5 phút). Trả hạn mới; KHÔNG trả token.
export async function POST(req: Request) {
  return handle(async () => {
    const r = await forceRefreshZaloToken(actorFromRequest(req));
    return { oaId: r.oaId, expiresAt: r.expiresAt, updatedAt: r.updatedAt };
  });
}

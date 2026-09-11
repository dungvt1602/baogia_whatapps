import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { publicBaseUrl } from "@/server/http/baseUrl";
import { zaloStatus } from "@/server/services/zaloTokenService";

// Trạng thái kết nối Zalo OA cho màn "Zalo OA": đã có token chưa, hết hạn lúc nào, cấu hình env đủ chưa.
// KHÔNG BAO GIỜ trả access_token/refresh_token ra client.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const base = publicBaseUrl(req);
    const st = await zaloStatus();
    return {
      ...st,
      callbackUrl: (process.env.ZALO_OAUTH_CALLBACK_URL || "").trim() || `${base}/api/zalo/oauth/callback`,
      webhookUrl: `${base}/api/webhooks/zalo`,
      autoRefresh: process.env.SEND_WORKER_DISABLED !== "true",
    };
  }, 500);
}

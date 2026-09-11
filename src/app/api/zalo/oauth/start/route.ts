import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { publicBaseUrl } from "@/server/http/baseUrl";
import { startZaloOAuth } from "@/server/services/zaloTokenService";

// Bước 3 (tài liệu Zalo): sinh cặp PKCE (code_verifier giữ trong DB, code_challenge trả về)
// + URL cấp quyền. Admin OA mở URL, bấm Đồng ý -> Zalo chuyển hướng về /api/zalo/oauth/callback.
// Callback URL PHẢI trùng với "Official Account Callback Url" đã khai trên developers.zalo.me.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { callbackUrl?: string };
    const callbackUrl =
      (body.callbackUrl || "").trim() ||
      (process.env.ZALO_OAUTH_CALLBACK_URL || "").trim() ||
      `${publicBaseUrl(req)}/api/zalo/oauth/callback`;
    return startZaloOAuth(callbackUrl);
  });
}

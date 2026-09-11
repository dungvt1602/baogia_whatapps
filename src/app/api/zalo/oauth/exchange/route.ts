import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { exchangeZaloCode } from "@/server/services/zaloTokenService";

// Đường TAY (khi callback URL không trỏ được về app, vd chạy local): admin copy `code` + `oa_id`
// trên thanh địa chỉ sau khi bấm Đồng ý, dán vào màn Zalo OA -> đổi lấy token bằng verifier đã cất.
export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { code?: string; oaId?: string; state?: string };
    return exchangeZaloCode({ code: body.code || "", oaId: body.oaId || null, state: body.state || null });
  });
}

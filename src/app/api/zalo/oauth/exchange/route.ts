import type { NextRequest } from "next/server";
import { handle } from "@/server/http/json";
import { exchangeZaloCode } from "@/server/services/zaloTokenService";

// Đường TAY (khi callback URL không trỏ được về app, vd chạy local / callback đã đăng ký là localhost):
// admin bấm Đồng ý xong, DÁN NGUYÊN LINK trình duyệt chuyển tới (…?oa_id=…&code=…&state=…) — hoặc chỉ code —
// app tự bóc code/oa_id/state rồi đổi lấy token bằng verifier đã cất.
function parseInput(raw: string): { code: string; oaId: string; state: string } {
  const s = (raw || "").trim();
  if (/[?&]code=/.test(s) || s.includes("://")) {
    try {
      const u = new URL(s.includes("://") ? s : "https://x/?" + s.replace(/^\?/, ""));
      return { code: u.searchParams.get("code") || "", oaId: u.searchParams.get("oa_id") || "", state: u.searchParams.get("state") || "" };
    } catch {
      // rơi xuống dưới
    }
  }
  return { code: s, oaId: "", state: "" };
}

export async function POST(req: NextRequest) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { code?: string; url?: string; oaId?: string; state?: string };
    const parsed = parseInput(body.url || body.code || "");
    return exchangeZaloCode({
      code: parsed.code,
      oaId: (body.oaId || "").trim() || parsed.oaId || null,
      state: (body.state || "").trim() || parsed.state || null,
    });
  });
}

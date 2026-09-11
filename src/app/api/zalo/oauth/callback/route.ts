import { NextRequest, NextResponse } from "next/server";
import { exchangeZaloCode } from "@/server/services/zaloTokenService";

// Bước 4+5 (tài liệu Zalo) gộp: Zalo chuyển hướng trình duyệt admin về đây kèm
//   ?oa_id=<OA_ID>&code=<CODE>&code_challenge=<...>&state=<...>
// -> đổi code lấy token NGAY (code chỉ dùng 1 lần, hết hạn vài phút) -> quay về màn Zalo OA.
// Không cần ai copy/paste code nữa.
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const code = sp.get("code") || "";
  const oaId = sp.get("oa_id") || "";
  const state = sp.get("state") || "";
  const back = new URL("/zalo-oa", req.nextUrl.origin);

  if (!code) {
    back.searchParams.set("zalo", "err");
    back.searchParams.set("msg", "Zalo không trả về code (admin OA chưa bấm Đồng ý?)");
    return NextResponse.redirect(back);
  }
  try {
    const r = await exchangeZaloCode({ code, oaId, state });
    back.searchParams.set("zalo", "ok");
    back.searchParams.set("oa", r.oaId);
  } catch (err) {
    back.searchParams.set("zalo", "err");
    back.searchParams.set("msg", err instanceof Error ? err.message : String(err));
  }
  return NextResponse.redirect(back);
}

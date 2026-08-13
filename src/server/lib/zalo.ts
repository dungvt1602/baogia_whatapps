import "server-only";

// Gửi tin nhắn văn bản qua Zalo OA (Official Account) tới 1 hoặc nhiều user_id.
// Dùng cho THÔNG BÁO NỘI BỘ (vd báo sếp khi có phản hồi khách), không phải gửi báo giá.
//
// Cấu hình qua env:
//   ZALO_OA_TOKEN_MAIN : access token của OA (Zalo cấp).
//   ZALO_BOSS_USER_ID  : user_id người nhận trên OA (nhiều người -> ngăn nhau bằng dấu phẩy).
// CHƯA cấu hình -> trả { skipped:true } (no-op) để app vẫn chạy; điền key sau là tự hoạt động.
//
// Lưu ý Zalo: gửi CS message cần người nhận đã tương tác với OA trong cửa sổ cho phép,
// và user_id là id theo OA (KHÔNG phải số điện thoại).

const ZALO_CS_ENDPOINT = "https://openapi.zalo.me/v3.0/oa/message/cs";

export type ZaloResult = { ok: boolean; skipped?: boolean; error?: string };

function recipients(): string[] {
  return (process.env.ZALO_BOSS_USER_ID || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isZaloConfigured(): boolean {
  return !!process.env.ZALO_OA_TOKEN_MAIN && recipients().length > 0;
}

// Gửi 1 đoạn text tới từng người nhận. KHÔNG BAO GIỜ ném lỗi (nuốt + trả kết quả).
export async function sendZaloText(text: string): Promise<ZaloResult> {
  const token = process.env.ZALO_OA_TOKEN_MAIN;
  const to = recipients();
  if (!token || to.length === 0) return { ok: false, skipped: true }; // chưa cấu hình -> bỏ qua

  try {
    let anyFail = false;
    for (const userId of to) {
      const res = await fetch(ZALO_CS_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json", access_token: token },
        body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
      });
      // Zalo trả error=0 khi thành công; khác 0 hoặc HTTP lỗi = thất bại.
      const data = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
      if (!res.ok || (typeof data?.error === "number" && data.error !== 0)) {
        anyFail = true;
        console.error("[zalo] gửi thất bại tới", userId, ":", JSON.stringify(data));
      }
    }
    return anyFail ? { ok: false, error: "một số người nhận gửi lỗi" } : { ok: true };
  } catch (err) {
    console.error("[zalo] lỗi mạng:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

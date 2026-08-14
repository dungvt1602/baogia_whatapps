import "server-only";
import crypto from "crypto";

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

// Gửi tới 1 user_id cụ thể bằng token truyền vào (dùng cho kênh nhận cấu hình trong DB).
export async function sendZaloTo(token: string, userId: string, text: string): Promise<ZaloResult> {
  if (!token || !userId) return { ok: false, skipped: true };
  try {
    const res = await fetch(ZALO_CS_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json", access_token: token },
      body: JSON.stringify({ recipient: { user_id: userId }, message: { text } }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: number; message?: string };
    if (!res.ok || (typeof data?.error === "number" && data.error !== 0)) {
      console.error("[zalo] gửi thất bại tới", userId, ":", JSON.stringify(data));
      return { ok: false, error: data?.message || "gửi lỗi" };
    }
    return { ok: true };
  } catch (err) {
    console.error("[zalo] lỗi mạng:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
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

// Verify chữ ký webhook Zalo: mac = SHA256(appId + rawBody + timestamp + OASecretKey).
// Truyền RAW body (chuỗi gốc Zalo gửi), KHÔNG dùng JSON.stringify lại (đổi byte -> sai mac).
// Chưa khai ZALO_OA_SECRET -> trả true (bỏ qua verify, để dev/local vẫn nhận được).
export function verifyZaloSignature(rawBody: string, timestamp: string, macHeader?: string | null): boolean {
  const secret = process.env.ZALO_OA_SECRET;
  const appId = process.env.ZALO_APP_ID || "";
  if (!secret) return true; // chưa cấu hình -> không chặn
  if (!macHeader) return false;
  const expect = crypto.createHash("sha256").update(appId + rawBody + timestamp + secret).digest("hex");
  const got = macHeader.replace(/^mac=/i, "").trim().toLowerCase();
  return got === expect.toLowerCase();
}

// Lấy tên hiển thị của user Zalo theo UID (vì webhook không trả SĐT).
// Lỗi/chưa cấu hình -> trả "" (không phá luồng nhận).
export async function getZaloProfile(userId: string): Promise<string> {
  const token = process.env.ZALO_OA_TOKEN_MAIN;
  if (!token || !userId) return "";
  try {
    const url = "https://openapi.zalo.me/v3.0/oa/user/detail?data=" + encodeURIComponent(JSON.stringify({ user_id: userId }));
    const res = await fetch(url, { headers: { access_token: token } });
    const data = (await res.json().catch(() => ({}))) as { data?: { display_name?: string } };
    return data?.data?.display_name || "";
  } catch (err) {
    console.error("[zalo] getZaloProfile lỗi:", err);
    return "";
  }
}

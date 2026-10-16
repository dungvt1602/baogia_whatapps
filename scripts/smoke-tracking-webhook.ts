// Smoke test chuyển tiếp nút "Confirm Goods Received" sang hệ thống theo dõi đơn (không cần DB, không gọi mạng thật):
//   npx tsx scripts/smoke-tracking-webhook.ts
// Pass = in "Kết quả: N pass, 0 fail"; fail = exit code != 0. fetch bị thay bằng mock, không có request thật nào ra ngoài.

import { createHmac } from "node:crypto";
import {
  classifyForwardStatus,
  forwardToTracking,
  isTrackingButtonMessage,
  signTrackingBody,
  TRACKING_SIGNATURE_HEADER,
} from "../src/server/lib/trackingWebhook";

let passed = 0;
let failed = 0;

function eq(label: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    passed++;
    console.log(`  ✓ ${label} -> ${String(actual)}`);
  } else {
    failed++;
    console.error(`  ✗ ${label} — kỳ vọng ${String(expected)}, nhận ${String(actual)}`);
  }
}

// Giá trị TEST, không phải bí mật thật.
const SECRET = "relay-secret-for-tests";
const URL_FWD = "https://tracking.example.test/webhooks/whatsapp";

// Vector tính ĐỘC LẬP bằng `printf '%s' <body> | openssl dgst -sha256 -hmac relay-secret-for-tests`.
const RAW_ASCII =
  '{"object":"whatsapp_business_account","entry":[{"id":"1","changes":[{"value":{"messages":[{"type":"button","button":{"payload":"ago:received:abc123"}}]}}]}]}';
const SIG_ASCII = "sha256=e628e0ae62e7c0c519ba174aaa8e43d49abca1cf42a5927000c82a3f30f6b024";
const RAW_UTF8 = '{"text":"Xác nhận đã nhận hàng ✓"}';
const SIG_UTF8 = "sha256=e53d41c573c8577a40164b602eec97b963c8f1d43c89b1ff5e9e063c84b0f06e";

type FetchCall = { url: string; init: RequestInit };
type FetchImpl = (url: string, init: RequestInit) => Promise<Response>;

const realFetch = globalThis.fetch;
const realWarn = console.warn;
const realError = console.error;
const realSetTimeout = globalThis.setTimeout;

function setEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

// Chạy một kịch bản với env + fetch mock; trả về các request đã gửi + log đã bắt được.
async function scenario(opts: { url?: string; secret?: string; fetchImpl?: FetchImpl; raw?: string }) {
  const oldUrl = process.env.WHATSAPP_WEBHOOK_FORWARD_URL;
  const oldSecret = process.env.TRACKING_RELAY_SECRET;
  setEnv("WHATSAPP_WEBHOOK_FORWARD_URL", opts.url);
  setEnv("TRACKING_RELAY_SECRET", opts.secret);
  const calls: FetchCall[] = [];
  const warns: string[] = [];
  const errors: string[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    calls.push({ url: String(url), init });
    return (opts.fetchImpl ?? (async () => new Response(null, { status: 200 })))(String(url), init);
  }) as typeof fetch;
  console.warn = (...a: unknown[]) => void warns.push(a.map(String).join(" "));
  console.error = (...a: unknown[]) => void errors.push(a.map(String).join(" "));
  try {
    const outcome = await forwardToTracking(opts.raw ?? RAW_ASCII);
    return { outcome, calls, warns, errors };
  } finally {
    globalThis.fetch = realFetch;
    console.warn = realWarn;
    console.error = realError;
    setEnv("WHATSAPP_WEBHOOK_FORWARD_URL", oldUrl);
    setEnv("TRACKING_RELAY_SECRET", oldSecret);
  }
}

const status = (code: number): FetchImpl => async () => new Response(null, { status: code });

async function main() {
  console.log("\n== signTrackingBody (công thức chữ ký) ==");
  eq("tên header", TRACKING_SIGNATURE_HEADER, "x-tracking-signature");
  eq("vector ASCII (openssl)", signTrackingBody(RAW_ASCII, SECRET), SIG_ASCII);
  eq("vector UTF-8 tiếng Việt (openssl)", signTrackingBody(RAW_UTF8, SECRET), SIG_UTF8);
  eq(
    "khớp createHmac trên byte UTF-8",
    signTrackingBody(RAW_UTF8, SECRET),
    "sha256=" + createHmac("sha256", SECRET).update(Buffer.from(RAW_UTF8, "utf8")).digest("hex"),
  );
  eq("dạng sha256=<64 hex thường>", /^sha256=[0-9a-f]{64}$/.test(signTrackingBody(RAW_ASCII, SECRET)), true);
  eq("đổi 1 byte body -> chữ ký khác", signTrackingBody(RAW_ASCII + " ", SECRET) === SIG_ASCII, false);
  eq("đổi secret -> chữ ký khác", signTrackingBody(RAW_ASCII, SECRET + "x") === SIG_ASCII, false);

  console.log("\n== forwardToTracking: request gửi đi ==");
  {
    const r = await scenario({ url: URL_FWD, secret: SECRET });
    eq("2xx -> ok", r.outcome, "ok");
    eq("đúng 1 request", r.calls.length, 1);
    const call = r.calls[0];
    const headers = (call?.init.headers || {}) as Record<string, string>;
    eq("gửi tới URL đã cấu hình", call?.url, URL_FWD);
    eq("method POST", call?.init.method, "POST");
    eq("content-type json", headers["content-type"], "application/json");
    eq("có header x-tracking-signature đúng vector", headers["x-tracking-signature"], SIG_ASCII);
    eq("KHÔNG chuyển x-hub-signature-256 của Meta", "x-hub-signature-256" in headers, false);
    eq("body giống hệt raw (chuỗi)", call?.init.body, RAW_ASCII);
    eq("có AbortSignal (timeout)", call?.init.signal instanceof AbortSignal, true);
    eq("secret không lọt vào log", [...r.warns, ...r.errors].some((l) => l.includes(SECRET)), false);
  }
  {
    // Body có ký tự không-ASCII + khoảng trắng/xuống dòng lạ: chữ ký phải tính trên ĐÚNG chuỗi được gửi.
    const raw = '{ "text" : "Xác nhận đã nhận hàng ✓" ,\n  "n":1 }\n';
    const r = await scenario({ url: URL_FWD, secret: SECRET, raw });
    const headers = (r.calls[0]?.init.headers || {}) as Record<string, string>;
    const sent = String(r.calls[0]?.init.body);
    eq("body UTF-8 + xuống dòng giữ nguyên byte", Buffer.compare(Buffer.from(sent, "utf8"), Buffer.from(raw, "utf8")), 0);
    eq("chữ ký tính trên đúng body đã gửi", headers["x-tracking-signature"], signTrackingBody(sent, SECRET));
  }
  {
    const r = await scenario({ url: URL_FWD, secret: `  ${SECRET}\n` });
    const headers = (r.calls[0]?.init.headers || {}) as Record<string, string>;
    eq("secret có khoảng trắng đầu/cuối được trim", headers["x-tracking-signature"], SIG_ASCII);
  }

  console.log("\n== forwardToTracking: thiếu cấu hình ==");
  {
    const r = await scenario({ url: undefined, secret: SECRET });
    eq("không có URL -> tính năng tắt, ok", r.outcome, "ok");
    eq("không có URL -> không gửi request", r.calls.length, 0);
  }
  for (const [label, secret] of [["thiếu hẳn biến", undefined], ["chuỗi rỗng", ""], ["toàn khoảng trắng", "   "]] as const) {
    const r = await scenario({ url: URL_FWD, secret });
    eq(`URL có, secret ${label} -> retry`, r.outcome, "retry");
    eq(`URL có, secret ${label} -> KHÔNG gửi request`, r.calls.length, 0);
    eq(`URL có, secret ${label} -> ghi log lỗi`, r.errors.some((l) => l.includes("TRACKING_RELAY_SECRET")), true);
    eq(`URL có, secret ${label} -> log không lộ URL`, r.errors.some((l) => l.includes("tracking.example.test")), false);
  }

  console.log("\n== forwardToTracking: phân loại kết quả ==");
  for (const [code, expected] of [
    [200, "ok"], [202, "ok"], [204, "ok"],
    [400, "rejected"], [401, "rejected"], [403, "rejected"], [404, "rejected"], [422, "rejected"],
    [500, "retry"], [502, "retry"], [503, "retry"],
  ] as const) {
    const r = await scenario({ url: URL_FWD, secret: SECRET, fetchImpl: status(code) });
    eq(`HTTP ${code}`, r.outcome, expected);
  }
  eq("classifyForwardStatus 3xx -> retry", classifyForwardStatus(302), "retry");
  eq("classifyForwardStatus 199 -> retry", classifyForwardStatus(199), "retry");

  console.log("\n== forwardToTracking: lỗi mạng / hết giờ (không bao giờ ném) ==");
  {
    const r = await scenario({ url: URL_FWD, secret: SECRET, fetchImpl: async () => { throw new TypeError("fetch failed"); } });
    eq("lỗi mạng -> retry", r.outcome, "retry");
  }
  {
    const r = await scenario({ url: URL_FWD, secret: SECRET, fetchImpl: async () => { throw "chuỗi lạ"; } });
    eq("ném giá trị không phải Error -> retry", r.outcome, "retry");
  }
  {
    // Ép timer hết giờ ngay: fetch mock chờ signal.abort rồi từ chối như fetch thật.
    globalThis.setTimeout = ((fn: () => void, ms?: number, ...rest: unknown[]) =>
      realSetTimeout(fn, ms === 10_000 ? 0 : ms, ...rest)) as typeof setTimeout;
    try {
      const hang: FetchImpl = (_u, init) =>
        new Promise((_res, rej) => {
          init.signal?.addEventListener("abort", () => rej(new DOMException("The operation was aborted.", "AbortError")));
        });
      const r = await scenario({ url: URL_FWD, secret: SECRET, fetchImpl: hang });
      eq("hết giờ (abort) -> retry", r.outcome, "retry");
    } finally {
      globalThis.setTimeout = realSetTimeout;
    }
  }

  console.log("\n== isTrackingButtonMessage ==");
  eq("button payload ago:received:<token ngẫu nhiên>", isTrackingButtonMessage({ type: "button", button: { payload: "ago:received:Zk3_9-aBcDeF0123456789xyz" } }), true);
  eq("button payload ago:received:<id số> (cũ)", isTrackingButtonMessage({ type: "button", button: { payload: "ago:received:42" } }), true);
  eq("nhãn nút template cũ", isTrackingButtonMessage({ type: "button", button: { text: " Confirm Goods Received " } }), true);
  eq("interactive button_reply cùng tiền tố", isTrackingButtonMessage({ type: "interactive", interactive: { button_reply: { id: "ago:received:tok" } } }), true);
  eq("button khác", isTrackingButtonMessage({ type: "button", button: { payload: "other", text: "Hi" } }), false);
  eq("tin text thường", isTrackingButtonMessage({ type: "text", text: { body: "ago:received:1" } }), false);
  eq("thiếu type", isTrackingButtonMessage({}), false);

  console.log(`\nKết quả: ${passed} pass, ${failed} fail`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error("Smoke test lỗi:", err);
  process.exit(1);
});

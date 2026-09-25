// Smoke test các hàm THUẦN (không cần DB, không cần Meta) — chạy để chắc code không lỗi runtime:
//   npx tsx scripts/smoke-pure.ts
// Pass = in "OK"; fail = ném lỗi (exit code != 0).

import { detectPhoneType } from "../src/server/lib/phoneType";
import { tierToLimit, resolveLimit } from "../src/server/lib/quotaTier";
import { channelTypeOf, isWhatsApp } from "../src/server/lib/channelType";
import { isDryRun } from "../src/server/lib/sendMode";

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

console.log("\n== detectPhoneType ==");
eq("VN mobile có mã vùng", detectPhoneType("84901234567"), "MOBILE");
eq("VN mobile nội địa (market VN)", detectPhoneType("0901234567", "VIETNAM"), "MOBILE");
eq("VN máy bàn 028 (market VN)", detectPhoneType("02838501234", "VIETNAM"), "FIXED_LINE");
eq("US số không phân biệt được", detectPhoneType("19012345678", "USA"), "AMBIGUOUS");
eq("India mobile", detectPhoneType("919812345678", "INDIA"), "MOBILE");
eq("Số VN không hợp lệ (10 chữ số)", detectPhoneType("0281234567", "VIETNAM"), "UNKNOWN");
eq("Chuỗi rỗng", detectPhoneType("", "VIETNAM"), "UNKNOWN");
eq("null", detectPhoneType(null, "VIETNAM"), "UNKNOWN");
eq("Số quá ngắn", detectPhoneType("12345"), "UNKNOWN");

console.log("\n== tierToLimit ==");
eq("TIER_2K", tierToLimit("TIER_2K"), 2000);
eq("TIER_10K", tierToLimit("TIER_10K"), 10000);
eq("TIER_100K", tierToLimit("TIER_100K"), 100000);
eq("TIER_1K (legacy)", tierToLimit("TIER_1K"), 1000);
eq("TIER_UNLIMITED", tierToLimit("TIER_UNLIMITED"), Infinity);
eq("Không rõ -> mặc định", tierToLimit("RANDOM"), 2000);
eq("null -> mặc định", tierToLimit(null), 2000);
eq("undefined -> mặc định", tierToLimit(undefined), 2000);
eq("chữ thường", tierToLimit("tier_10k"), 10000);

// Hạn mức + "có biết chắc không". Đây là chỗ từng để lọt bug: Meta KHÔNG trả messaging_limit_tier
// nữa, app rơi về 2.000 nhưng vẫn báo là biết chắc -> Tổng quan hiện số bịa.
console.log("\n== resolveLimit (hạn mức + có chắc không) ==");
eq("TIER_2K -> biết chắc", resolveLimit("TIER_2K").limit, 2000);
eq("TIER_2K -> unknown=false", resolveLimit("TIER_2K").unknown, false);
eq("Meta không trả tier -> vẫn 2.000", resolveLimit(null).limit, 2000);
eq("Meta không trả tier -> unknown=TRUE", resolveLimit(null).unknown, true);
eq("Chuỗi rỗng -> unknown=TRUE", resolveLimit("").unknown, true);
eq("Toàn khoảng trắng -> unknown=TRUE", resolveLimit("   ").unknown, true);
eq("Tier lạ -> unknown=TRUE", resolveLimit("TIER_999K").unknown, true);
eq("TIER_UNLIMITED -> vô hạn", resolveLimit("TIER_UNLIMITED").limit, Infinity);
eq("TIER_UNLIMITED -> biết chắc", resolveLimit("TIER_UNLIMITED").unknown, false);

// Loại kênh: confirmSend và worker PHẢI cùng một mặc định, nếu không lệnh thiếu kênh sẽ gửi
// thật qua WhatsApp mà worker tưởng không phải WhatsApp -> bỏ qua hạn mức.
console.log("\n== channelTypeOf / isWhatsApp ==");
eq("Có kênh WHATSAPP", channelTypeOf({ type: "WHATSAPP" }), "WHATSAPP");
eq("Chữ thường -> hoa", channelTypeOf({ type: "whatsapp" }), "WHATSAPP");
eq("Kênh ZALO", channelTypeOf({ type: "ZALO" }), "ZALO");
eq("KHÔNG gắn kênh -> mặc định WHATSAPP", channelTypeOf(null), "WHATSAPP");
eq("type rỗng -> mặc định WHATSAPP", channelTypeOf({ type: "" }), "WHATSAPP");
eq("KHÔNG gắn kênh -> isWhatsApp=true", isWhatsApp(null), true);
eq("undefined -> isWhatsApp=true", isWhatsApp(undefined), true);
eq("ZALO -> isWhatsApp=false", isWhatsApp({ type: "ZALO" }), false);
eq("TELEGRAM -> isWhatsApp=false", isWhatsApp({ type: "TELEGRAM" }), false);

// Chế độ gửi. QUAN TRỌNG NHẤT: mặc định phải là GỬI GIẢ — thiếu biến, giá trị lạ, gõ nhầm đều
// KHÔNG được vô tình bật gửi thật cho khách. Chỉ vài cách viết rõ ràng mới là gửi thật.
console.log("\n== isDryRun (chế độ gửi) ==");
{
  const check = (label: string, value: string | undefined, expectDry: boolean) => {
    const old = process.env.SEND_DRY_RUN;
    if (value === undefined) delete process.env.SEND_DRY_RUN;
    else process.env.SEND_DRY_RUN = value;
    eq(label, isDryRun(), expectDry);
    if (old === undefined) delete process.env.SEND_DRY_RUN;
    else process.env.SEND_DRY_RUN = old;
  };
  // --- phải GỬI THẬT (dry = false) ---
  check('"false" -> gửi thật', "false", false);
  check('"FALSE" -> gửi thật', "FALSE", false);
  check('"False" -> gửi thật', "False", false);
  check('" false " (dính khoảng trắng) -> gửi thật', " false ", false);
  check('"0" -> gửi thật', "0", false);
  check('"no" -> gửi thật', "no", false);
  check('"off" -> gửi thật', "off", false);
  // --- phải GỬI GIẢ (mặc định an toàn) ---
  check("thiếu hẳn biến -> gửi giả", undefined, true);
  check('chuỗi rỗng -> gửi giả', "", true);
  check('"true" -> gửi giả', "true", true);
  check('"1" -> gửi giả', "1", true);
  check('giá trị lạ -> gửi giả', "xyz", true);
  check('"falsee" gõ thừa -> gửi giả', "falsee", true);
  check('"fals" gõ thiếu -> gửi giả', "fals", true);
}

console.log(`\nKết quả: ${passed} pass, ${failed} fail`);
if (failed > 0) process.exit(1);

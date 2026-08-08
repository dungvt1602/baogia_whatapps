// Điền biến trong nội dung template từ dữ liệu báo giá + khách hàng.
// Mượn ý tưởng {khách hàng}, {mã}, {giá}... như bot Telegram.

type QuotationLike = {
  code: string;
  title: string | null;
  totalAmount: unknown; // Prisma.Decimal
  currency: string;
  market: string | null;
  issuedDate: Date | null;
  validUntil: Date | null;
};

type CustomerLike = { name: string } | null | undefined;

function fmtMoney(amount: unknown, currency: string): string {
  const n = Number(amount ?? 0);
  if (!Number.isFinite(n)) return `${amount ?? ""} ${currency}`.trim();
  return `${n.toLocaleString("vi-VN")} ${currency}`.trim();
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function renderTemplate(
  body: string,
  quotation: QuotationLike,
  customer?: CustomerLike,
): string {
  const map: Record<string, string> = {
    "khách hàng": customer?.name ?? "",
    "mã": quotation.code,
    "tiêu đề": quotation.title ?? "",
    "giá": fmtMoney(quotation.totalAmount, quotation.currency),
    "thị trường": quotation.market ?? "",
    "ngày gửi": fmtDate(quotation.issuedDate),
    "hiệu lực": fmtDate(quotation.validUntil),
  };

  // Thay {key} nếu biết; giữ nguyên nếu không có trong map.
  return (body || "").replace(/\{([^}]+)\}/g, (whole, rawKey: string) => {
    const key = rawKey.trim().toLowerCase();
    return key in map ? map[key] : whole;
  });
}

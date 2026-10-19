// Nhãn + màu cho loại số điện thoại / trạng thái WhatsApp (đồng bộ với giá trị trong
// src/server/lib/phoneType.ts và cột customers.phone_type / customers.wa_status).
// File thuần dữ liệu (không "use client", không import server) -> dùng được ở cả FE lẫn BE.

export type PhoneTypeCode = "MOBILE" | "FIXED_LINE" | "AMBIGUOUS" | "UNKNOWN";

export const PHONE_TYPE_META: Record<string, { label: string; bg: string; fg: string }> = {
  MOBILE: { label: "Di động", bg: "#E7F5EC", fg: "#1F7440" },
  FIXED_LINE: { label: "Máy bàn", bg: "#FDF3E0", fg: "#B07208" },
  AMBIGUOUS: { label: "Không rõ", bg: "#F1F4F1", fg: "#8B9A90" },
  UNKNOWN: { label: "Không xác định", bg: "#F1F4F1", fg: "#8B9A90" },
};

export const PHONE_TYPE_OPTIONS: PhoneTypeCode[] = ["MOBILE", "FIXED_LINE", "AMBIGUOUS", "UNKNOWN"];

export const WA_STATUS_META: Record<string, { label: string; bg: string; fg: string }> = {
  NO_WHATSAPP: { label: "Không có WhatsApp", bg: "#FDECEC", fg: "#B3261E" },
};

import { describe, expect, it } from "vitest";
import { PHONE_TYPE_META, PHONE_TYPE_OPTIONS, WA_STATUS_META } from "@/lib/phone-type-meta";

describe("phone-type-meta", () => {
  it("mọi lựa chọn đều có meta đầy đủ nhãn + màu", () => {
    for (const code of PHONE_TYPE_OPTIONS) {
      const meta = PHONE_TYPE_META[code];
      expect(meta, code).toBeDefined();
      expect(meta.label).not.toBe("");
      expect(meta.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(meta.fg).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  it("danh sách lựa chọn khớp các key của meta, không trùng", () => {
    expect([...PHONE_TYPE_OPTIONS].sort()).toEqual(Object.keys(PHONE_TYPE_META).sort());
    expect(new Set(PHONE_TYPE_OPTIONS).size).toBe(PHONE_TYPE_OPTIONS.length);
  });

  it("nhãn tiếng Việt của loại số chính", () => {
    expect(PHONE_TYPE_META.MOBILE.label).toBe("Di động");
    expect(PHONE_TYPE_META.FIXED_LINE.label).toBe("Máy bàn");
  });

  it("trạng thái NO_WHATSAPP có nhãn", () => {
    expect(WA_STATUS_META.NO_WHATSAPP.label).toBe("Không có WhatsApp");
  });
});

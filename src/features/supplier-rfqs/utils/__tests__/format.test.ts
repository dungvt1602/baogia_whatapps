import { describe, expect, it } from "vitest";
import {
  AMBIGUOUS_SEPARATOR_MSG,
  DECIMAL_LIMIT_MSG,
  compareDecimal,
  isZeroDecimal,
  formatDateTime,
  formatDecimal,
  formatMoney,
  fromLocalInput,
  parseDecimalInput,
  toLocalInput,
} from "@/features/supplier-rfqs/utils/format";

describe("formatDecimal", () => {
  it("nhóm nghìn kiểu vi-VN và bỏ số 0 thừa phần lẻ", () => {
    expect(formatDecimal("1500000.0000")).toBe("1.500.000");
    expect(formatDecimal("12.5000")).toBe("12,5");
    expect(formatDecimal("0.05")).toBe("0,05");
  });

  it("giữ độ chính xác với số rất lớn (không qua Number)", () => {
    expect(formatDecimal("12345678901234567890.1234")).toBe("12.345.678.901.234.567.890,1234");
  });

  it("rỗng/null -> gạch ngang; không phải số -> trả nguyên", () => {
    expect(formatDecimal(null)).toBe("—");
    expect(formatDecimal("")).toBe("—");
    expect(formatDecimal("abc")).toBe("abc");
  });

  it("số âm", () => {
    expect(formatDecimal("-1234.5")).toBe("-1.234,5");
  });
});

describe("formatMoney", () => {
  it("ghép mã tiền tệ", () => {
    expect(formatMoney("25000", "VND")).toBe("25.000 VND");
    expect(formatMoney("25000")).toBe("25.000");
    expect(formatMoney(null, "VND")).toBe("—");
  });
});

describe("ngày giờ", () => {
  it("formatDateTime dùng giờ máy, định dạng dd/MM/yyyy HH:mm", () => {
    const iso = new Date(2026, 9, 30, 17, 5).toISOString();
    expect(formatDateTime(iso)).toBe("30/10/2026 17:05");
    expect(formatDateTime(null)).toBe("—");
    expect(formatDateTime("không phải ngày")).toBe("—");
  });

  it("toLocalInput <-> fromLocalInput khứ hồi, không phụ thuộc múi giờ", () => {
    const local = "2026-10-30T17:05";
    const iso = fromLocalInput(local);
    expect(iso).not.toBeNull();
    expect(toLocalInput(iso)).toBe(local);
  });

  it("rỗng hoặc sai -> rỗng/null", () => {
    expect(fromLocalInput("")).toBeNull();
    expect(fromLocalInput("xyz")).toBeNull();
    expect(toLocalInput(null)).toBe("");
  });
});

describe("parseDecimalInput", () => {
  it("rỗng là hợp lệ (ô tuỳ chọn)", () => {
    expect(parseDecimalInput("  ")).toEqual({ ok: true, value: "" });
  });

  it("chấp nhận số nguyên và số lẻ rõ ràng", () => {
    expect(parseDecimalInput("25000")).toEqual({ ok: true, value: "25000" });
    expect(parseDecimalInput("25.5")).toEqual({ ok: true, value: "25.5" });
    expect(parseDecimalInput("1,5")).toEqual({ ok: true, value: "1.5" });
    expect(parseDecimalInput("25.50")).toEqual({ ok: true, value: "25.50" });
    expect(parseDecimalInput(".5")).toEqual({ ok: true, value: "0.5" });
    expect(parseDecimalInput("1 000")).toEqual({ ok: true, value: "1000" });
  });

  it("từ chối định dạng mơ hồ thay vì hiểu sai lặng lẽ", () => {
    for (const v of ["25.000", "25,000", "1.500,5", "1,500.5", "1.500.000", "1,500,000", "0.500"]) {
      expect(parseDecimalInput(v), v).toEqual({ ok: false, message: AMBIGUOUS_SEPARATOR_MSG });
    }
  });

  it("từ chối số âm, chữ, nhiều dấu chấm, dấu chấm cuối (không message riêng)", () => {
    for (const v of ["-1", "abc", "1.2.3", "5."]) {
      expect(parseDecimalInput(v), v).toMatchObject({ ok: false });
    }
  });

  it("giới hạn BE: tối đa 14 chữ số nguyên và 4 chữ số lẻ", () => {
    expect(parseDecimalInput("12345678901234")).toEqual({ ok: true, value: "12345678901234" });
    expect(parseDecimalInput("123456789012345")).toEqual({ ok: false, message: DECIMAL_LIMIT_MSG });
    expect(parseDecimalInput("1.1234")).toEqual({ ok: true, value: "1.1234" });
    expect(parseDecimalInput("1.12345")).toEqual({ ok: false, message: DECIMAL_LIMIT_MSG });
  });
});

describe("isZeroDecimal", () => {
  it("nhận biết giá trị 0", () => {
    expect(isZeroDecimal("0")).toBe(true);
    expect(isZeroDecimal("0.00")).toBe(true);
    expect(isZeroDecimal("0.01")).toBe(false);
    expect(isZeroDecimal("10")).toBe(false);
  });
});

describe("compareDecimal", () => {
  it("so sánh theo giá trị, không theo chữ", () => {
    expect(compareDecimal("9", "10")).toBeLessThan(0);
    expect(compareDecimal("10.50", "10.5")).toBe(0);
    expect(compareDecimal("0.10", "0.9")).toBeLessThan(0);
    expect(compareDecimal("100.001", "100")).toBeGreaterThan(0);
    expect(compareDecimal("007", "7")).toBe(0);
  });
});

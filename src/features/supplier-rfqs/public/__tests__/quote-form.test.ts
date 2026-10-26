import { describe, expect, it } from "vitest";
import { AMBIGUOUS_SEPARATOR_MSG, DECIMAL_LIMIT_MSG } from "@/features/supplier-rfqs/utils/format";
import type { PublicRfq } from "@/features/supplier-rfqs/types";
import { initQuoteForm, validateQuote, type QuoteFormState } from "@/features/supplier-rfqs/public/quote-form";

const baseData: PublicRfq = {
  rfq: { code: "RFQ-2026-0001", title: "Cam", note: null, currency: "VND", deadline: null, hasImage: false, imageUrl: null },
  supplierName: "NCC A",
  isTest: false,
  expired: false,
  canSubmit: true,
  items: [
    { id: "1", no: 1, product: "Cam sành", spec: null, unit: "kg", quantity: "100", note: null },
    { id: "2", no: 2, product: "Bưởi", spec: null, unit: "kg", quantity: "50", note: null },
  ],
  quote: null,
};

const emptyForm = (): QuoteFormState => initQuoteForm(baseData);

describe("initQuoteForm", () => {
  it("chưa có quote: để trống, tiền tệ lấy của RFQ", () => {
    const f = emptyForm();
    expect(f.currency).toBe("VND");
    expect(f.rows).toHaveLength(2);
    expect(f.rows[0]).toEqual({ rfqItemId: "1", unitPrice: "", moq: "", leadTimeDays: "", note: "" });
  });

  it("có quote: điền sẵn theo rfqItemId, cắt validUntil về YYYY-MM-DD; tiền tệ luôn theo RFQ", () => {
    const f = initQuoteForm({
      ...baseData,
      quote: {
        version: 2,
        currency: "USD",
        validUntil: "2026-11-30T00:00:00.000Z",
        note: "giá FOB",
        items: [{ rfqItemId: "2", unitPrice: "1.5", moq: "10", leadTimeDays: 7, note: "ok" }],
      },
    });
    expect(f.currency).toBe("VND");
    expect(f.validUntil).toBe("2026-11-30");
    expect(f.note).toBe("giá FOB");
    expect(f.rows[0].unitPrice).toBe("");
    expect(f.rows[1]).toEqual({ rfqItemId: "2", unitPrice: "1.5", moq: "10", leadTimeDays: "7", note: "ok" });
  });
});

describe("validateQuote", () => {
  it("không có giá nào -> lỗi form, không có payload", () => {
    const r = validateQuote(emptyForm());
    expect(r.ok).toBe(false);
    expect(r.payload).toBeUndefined();
    expect(r.formError).toBe("Vui lòng nhập đơn giá cho ít nhất một mặt hàng.");
  });

  it("báo giá một phần: bỏ mặt hàng không có giá, map đúng payload (giữ chuỗi thập phân)", () => {
    const f = emptyForm();
    f.currency = "usd";
    f.validUntil = "2026-12-31";
    f.note = " ghi chú ";
    f.rows[0] = { rfqItemId: "1", unitPrice: "25000,5", moq: "100", leadTimeDays: "7", note: " tươi " };
    const r = validateQuote(f);
    expect(r.ok).toBe(true);
    expect(r.payload).toEqual({
      currency: "USD",
      validUntil: "2026-12-31",
      note: "ghi chú",
      items: [{ rfqItemId: "1", unitPrice: "25000.5", moq: "100", leadTimeDays: 7, note: "tươi" }],
    });
  });

  it("số âm / chữ ở đơn giá, MOQ, ngày giao báo đúng ô", () => {
    const f = emptyForm();
    f.rows[0] = { rfqItemId: "1", unitPrice: "-5", moq: "abc", leadTimeDays: "1.5", note: "" };
    const r = validateQuote(f);
    expect(r.ok).toBe(false);
    expect(r.rowErrors["1"]).toEqual({
      unitPrice: "Đơn giá phải là số lớn hơn 0",
      moq: "MOQ phải là số không âm",
      leadTimeDays: "Số ngày phải là số nguyên từ 0 đến 3650",
    });
    expect(r.formError).toBe("Vui lòng sửa các ô báo đỏ bên dưới.");
  });

  it("có MOQ/ghi chú nhưng thiếu đơn giá -> lỗi ở ô đơn giá", () => {
    const f = emptyForm();
    f.rows[0] = { rfqItemId: "1", unitPrice: "", moq: "10", leadTimeDays: "", note: "" };
    f.rows[1] = { rfqItemId: "2", unitPrice: "5", moq: "", leadTimeDays: "", note: "" };
    const r = validateQuote(f);
    expect(r.rowErrors["1"]).toEqual({ unitPrice: "Nhập đơn giá cho mặt hàng này" });
    expect(r.ok).toBe(false);
  });

  it("tiền tệ và ngày hiệu lực sai bị chặn", () => {
    const f = emptyForm();
    f.rows[0].unitPrice = "1";
    f.currency = "DONG";
    f.validUntil = "2026-02-31";
    const r = validateQuote(f);
    expect(r.ok).toBe(false);
    expect(r.currencyError).toBeDefined();
    expect(r.validUntilError).toBe("Ngày hiệu lực không hợp lệ");
  });

  it("đơn giá 0 bị từ chối (BE yêu cầu > 0)", () => {
    const f = emptyForm();
    f.rows[0].unitPrice = "0";
    const r = validateQuote(f);
    expect(r.ok).toBe(false);
    expect(r.rowErrors["1"].unitPrice).toBe("Đơn giá phải lớn hơn 0");
  });

  it("định dạng mơ hồ 25.000 / 25,000 / 1.500,5 bị chặn với thông báo rõ, không gửi", () => {
    for (const v of ["25.000", "25,000", "1.500,5"]) {
      const f = emptyForm();
      f.rows[0].unitPrice = v;
      const r = validateQuote(f);
      expect(r.ok, v).toBe(false);
      expect(r.rowErrors["1"].unitPrice, v).toBe(AMBIGUOUS_SEPARATOR_MSG);
    }
  });

  it("MOQ mơ hồ và vượt giới hạn 14.4 chữ số báo đúng ô", () => {
    const f = emptyForm();
    f.rows[0] = { rfqItemId: "1", unitPrice: "123456789012345", moq: "1.500", leadTimeDays: "", note: "" };
    const r = validateQuote(f);
    expect(r.rowErrors["1"]).toEqual({ unitPrice: DECIMAL_LIMIT_MSG, moq: AMBIGUOUS_SEPARATOR_MSG });
  });

  it("thời gian giao: 0 và 3650 hợp lệ, 3651 bị chặn", () => {
    const f = emptyForm();
    f.rows[0] = { rfqItemId: "1", unitPrice: "5", moq: "", leadTimeDays: "3650", note: "" };
    expect(validateQuote(f).ok).toBe(true);
    f.rows[0].leadTimeDays = "0";
    expect(validateQuote(f).payload?.items[0].leadTimeDays).toBe(0);
    f.rows[0].leadTimeDays = "3651";
    expect(validateQuote(f).rowErrors["1"].leadTimeDays).toBe("Số ngày phải là số nguyên từ 0 đến 3650");
  });
});

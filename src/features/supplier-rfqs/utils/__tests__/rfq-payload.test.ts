import { describe, expect, it } from "vitest";
import {
  createPayload,
  infoPatchPayload,
  itemsToDrafts,
  newItemDraft,
  validateItems,
} from "@/features/supplier-rfqs/utils/rfq-payload";

describe("validateItems", () => {
  it("bỏ dòng trống, cắt khoảng trắng, chỉ gửi ô có giá trị", () => {
    const r = validateItems([
      newItemDraft({ product: "  Cam sành ", unit: "kg", quantity: "1,5" }),
      newItemDraft(),
      newItemDraft({ product: "Bưởi", spec: "loại 1", note: "ghi chú" }),
    ]);
    expect(r.ok).toBe(true);
    expect(r.items).toEqual([
      { product: "Cam sành", unit: "kg", quantity: "1.5" },
      { product: "Bưởi", spec: "loại 1", note: "ghi chú" },
    ]);
  });

  it("báo lỗi đúng dòng, đúng ô", () => {
    const bad = newItemDraft({ quantity: "5" });
    const badQty = newItemDraft({ product: "Cam", quantity: "-3" });
    const r = validateItems([bad, badQty]);
    expect(r.ok).toBe(false);
    expect(r.errors[bad.key]).toEqual({ product: "Nhập tên mặt hàng" });
    expect(r.errors[badQty.key]).toEqual({ quantity: "Số lượng phải là số không âm" });
  });

  it("toàn dòng trống -> empty, không ok", () => {
    const r = validateItems([newItemDraft(), newItemDraft()]);
    expect(r.ok).toBe(false);
    expect(r.empty).toBe(true);
  });

  it("giữ nguyên chuỗi thập phân trong giới hạn BE (14.4), không qua number", () => {
    const r = validateItems([newItemDraft({ product: "X", quantity: "12345678901234.1234" })]);
    expect(r.items[0].quantity).toBe("12345678901234.1234");
  });

  it("số lượng mơ hồ hoặc vượt giới hạn bị báo đúng dòng", () => {
    const a = newItemDraft({ product: "X", quantity: "1.500" });
    const b = newItemDraft({ product: "Y", quantity: "1.12345" });
    const r = validateItems([a, b]);
    expect(r.errors[a.key].quantity).toMatch(/Dấu phân cách không rõ/);
    expect(r.errors[b.key].quantity).toMatch(/tối đa 14 chữ số/);
  });
});

describe("createPayload", () => {
  it("chuẩn hoá tiền tệ, bỏ note/deadline rỗng, hạn thành ISO", () => {
    const p = createPayload({ title: " Báo giá cam ", note: "", currency: "usd", deadline: "2026-10-30T17:00" }, [{ product: "Cam" }]);
    expect(p.title).toBe("Báo giá cam");
    expect(p.currency).toBe("USD");
    expect(p.note).toBeUndefined();
    expect(p.deadline).toBe(new Date("2026-10-30T17:00").toISOString());
    expect(p.items).toEqual([{ product: "Cam" }]);
  });

  it("không có hạn thì không gửi deadline", () => {
    const p = createPayload({ title: "T", note: "n", currency: "", deadline: "" }, []);
    expect(p.deadline).toBeUndefined();
    expect(p.currency).toBe("VND");
    expect(p.note).toBe("n");
  });
});

describe("infoPatchPayload", () => {
  const form = { title: "T", note: "", currency: "VND", deadline: "" };
  it("xoá hạn đã có -> deadline null", () => {
    expect(infoPatchPayload(form, true).deadline).toBeNull();
  });
  it("chưa từng có hạn và để trống -> bỏ field", () => {
    expect("deadline" in infoPatchPayload(form, false)).toBe(false);
  });
  it("có hạn -> ISO", () => {
    expect(infoPatchPayload({ ...form, deadline: "2026-10-30T17:00" }, false).deadline).toBe(new Date("2026-10-30T17:00").toISOString());
  });
});

describe("itemsToDrafts", () => {
  it("null thành chuỗi rỗng, mỗi dòng có key riêng", () => {
    const d = itemsToDrafts([
      { id: "1", no: 1, product: "Cam", spec: null, unit: "kg", quantity: "10.5", note: null },
      { id: "2", no: 2, product: "Bưởi", spec: null, unit: null, quantity: null, note: null },
    ]);
    expect(d[0]).toMatchObject({ product: "Cam", spec: "", unit: "kg", quantity: "10.5", note: "" });
    expect(new Set(d.map((x) => x.key)).size).toBe(2);
  });
});

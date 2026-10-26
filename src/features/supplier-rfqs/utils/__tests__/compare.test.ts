import { describe, expect, it } from "vitest";
import type { CompareData, CompareRow } from "@/features/supplier-rfqs/types";
import { bestInvitationIds, buildMatrix, isMixedCurrency, submittedSupplierCount } from "@/features/supplier-rfqs/utils/compare";

const price = (invitationId: string, unitPrice: string) => ({ invitationId, unitPrice, moq: null, leadTimeDays: null, note: null });

const data: CompareData = {
  rfq: { id: "1", code: "RFQ-2026-0001", title: "Cam", currency: "VND", deadline: null, status: "SENT" },
  suppliers: [
    { invitationId: "10", supplierId: "1", name: "A", status: "SUBMITTED", submittedAt: "2026-10-01T00:00:00Z", version: 1, currency: "VND", note: null },
    { invitationId: "11", supplierId: "2", name: "B", status: "SUBMITTED", submittedAt: "2026-10-02T00:00:00Z", version: 2, currency: "VND", note: null },
    { invitationId: "12", supplierId: "3", name: "C", status: "SENT", submittedAt: null, version: null, currency: null, note: null },
  ],
  rows: [
    { itemId: "1", no: 1, product: "Cam", unit: "kg", quantity: "100", prices: [price("10", "25000"), price("11", "9000"), null], bestInvitationId: "11" },
    { itemId: "2", no: 2, product: "Bưởi", unit: "kg", quantity: "50", prices: [price("10", "30000"), null, null], bestInvitationId: "10" },
  ],
};

describe("bestInvitationIds", () => {
  it("tin bestInvitationId của BE, và gộp NCC hoà giá", () => {
    const row: CompareRow = { ...data.rows[0], prices: [price("10", "9000.00"), price("11", "9000"), null], bestInvitationId: "11" };
    expect([...bestInvitationIds(row)].sort()).toEqual(["10", "11"]);
  });

  it("BE không trả best thì tự tính theo giá trị (9000 < 25000 dù so chữ thì ngược)", () => {
    const row: CompareRow = { ...data.rows[0], bestInvitationId: null };
    expect([...bestInvitationIds(row)]).toEqual(["11"]);
  });

  it("dòng không có giá nào -> rỗng", () => {
    const row: CompareRow = { ...data.rows[0], prices: [null, null, null], bestInvitationId: null };
    expect(bestInvitationIds(row).size).toBe(0);
  });
});

describe("buildMatrix", () => {
  const m = buildMatrix(data);

  it("ô giữ đúng thứ tự NCC, null khi chưa có giá", () => {
    expect(m[0].cells.map((c) => c?.unitPrice ?? null)).toEqual(["25000", "9000", null]);
  });

  it("chỉ tô giá thấp nhất khi có từ 2 giá", () => {
    expect(m[0].cells.map((c) => c?.isBest ?? false)).toEqual([false, true, false]);
    // Dòng 2 chỉ có 1 NCC báo giá -> không tô.
    expect(m[1].cells.map((c) => c?.isBest ?? false)).toEqual([false, false, false]);
  });
});

describe("nhiều tiền tệ", () => {
  const mixed: CompareData = {
    ...data,
    suppliers: data.suppliers.map((s, i) => (i === 1 ? { ...s, currency: "USD" } : s)),
  };

  it("phát hiện khi các NCC có giá dùng tiền tệ khác nhau", () => {
    expect(isMixedCurrency(data)).toBe(false);
    expect(isMixedCurrency(mixed)).toBe(true);
  });

  it("NCC không có giá nào không tính vào việc trộn tiền tệ", () => {
    const only = { ...mixed, suppliers: mixed.suppliers.map((s, i) => (i === 2 ? { ...s, currency: "EUR" } : s)) };
    expect(isMixedCurrency(only)).toBe(true); // vẫn trộn VND/USD
    const noPrice: CompareData = { ...data, suppliers: data.suppliers.map((s, i) => (i === 2 ? { ...s, currency: "EUR" } : s)) };
    expect(isMixedCurrency(noPrice)).toBe(false); // EUR là NCC chưa nộp giá
  });

  it("trộn tiền tệ thì không tô giá thấp nhất", () => {
    const m = buildMatrix(mixed);
    expect(m.flatMap((r) => r.cells.map((c) => c?.isBest ?? false)).some(Boolean)).toBe(false);
  });
});

describe("submittedSupplierCount", () => {
  it("đếm NCC đã nộp", () => {
    expect(submittedSupplierCount(data)).toBe(2);
  });
});

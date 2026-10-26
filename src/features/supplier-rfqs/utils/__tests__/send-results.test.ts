import { describe, expect, it } from "vitest";
import { resultKind, summarizeResults } from "@/features/supplier-rfqs/utils/send-results";

const r = (ok: boolean, error?: string) => ({ supplierId: "1", supplierName: "A", ok, status: "X", error });

describe("send results", () => {
  it("ok kèm error là bỏ qua, không phải đã gửi", () => {
    expect(resultKind(r(true))).toBe("sent");
    expect(resultKind(r(true, "Đã gửi trước đó."))).toBe("skipped");
    expect(resultKind(r(false, "Zalo từ chối"))).toBe("failed");
  });
  it("tổng hợp", () => {
    expect(summarizeResults([r(true), r(true, "Đã gửi trước đó."), r(false), r(true)])).toEqual({ sent: 2, skipped: 1, failed: 1 });
  });
});

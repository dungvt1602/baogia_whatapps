import { describe, expect, it } from "vitest";
import { rfqFieldErrors, rfqInfoSchema } from "@/features/supplier-rfqs/schemas/rfq-schema";

const valid = { title: "Báo giá cam", note: "", currency: "VND", deadline: "" };

function errorOf(input: Record<string, string>, field: string) {
  const r = rfqInfoSchema.safeParse(input);
  return r.success ? undefined : rfqFieldErrors(r.error.issues)[field];
}

describe("rfqInfoSchema", () => {
  it("hợp lệ với dữ liệu tối thiểu và có hạn", () => {
    expect(rfqInfoSchema.safeParse(valid).success).toBe(true);
    expect(rfqInfoSchema.safeParse({ ...valid, deadline: "2026-10-30T17:00" }).success).toBe(true);
  });

  it("thiếu tiêu đề -> lỗi ở ô title", () => {
    expect(errorOf({ ...valid, title: "  " }, "title")).toBe("Vui lòng nhập tiêu đề");
  });

  it("tiền tệ sai -> lỗi ở ô currency", () => {
    expect(errorOf({ ...valid, currency: "DONG" }, "currency")).toBe("Tiền tệ là mã 3 chữ cái (VD: VND, USD)");
    expect(errorOf({ ...valid, currency: "" }, "currency")).toBeDefined();
  });

  it("hạn không phải ngày -> lỗi ở ô deadline", () => {
    expect(errorOf({ ...valid, deadline: "abc" }, "deadline")).toBe("Hạn báo giá không hợp lệ");
  });
});

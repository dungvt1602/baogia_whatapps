import { describe, expect, it } from "vitest";
import { fieldErrors, supplierSchema } from "@/features/suppliers/schemas/supplier-schema";

const valid = { name: "Công ty ABC", company: "", phone: "", email: "", zaloUserId: "", note: "" };

function errorOf(input: Record<string, string>, field: string) {
  const r = supplierSchema.safeParse(input);
  if (r.success) return undefined;
  return fieldErrors(r.error.issues)[field];
}

describe("supplierSchema", () => {
  it("chấp nhận dữ liệu tối thiểu (chỉ tên)", () => {
    expect(supplierSchema.safeParse(valid).success).toBe(true);
  });

  it("chấp nhận đầy đủ các ô", () => {
    const r = supplierSchema.safeParse({
      name: "A",
      company: "Cty A",
      phone: "+84 901 234 567",
      email: "a@b.co",
      zaloUserId: "1234567890123456789",
      note: "ghi chú",
    });
    expect(r.success).toBe(true);
  });

  it("báo thiếu tên đúng ô name", () => {
    expect(errorOf({ ...valid, name: "   " }, "name")).toBe("Vui lòng nhập tên nhà cung cấp");
  });

  it("báo SĐT sai ở ô phone", () => {
    expect(errorOf({ ...valid, phone: "12ab" }, "phone")).toBe("SĐT chỉ gồm 6-15 chữ số");
    expect(errorOf({ ...valid, phone: "123" }, "phone")).toBe("SĐT chỉ gồm 6-15 chữ số");
  });

  it("báo email sai ở ô email", () => {
    expect(errorOf({ ...valid, email: "khong-hop-le" }, "email")).toBe("Email không hợp lệ");
  });

  it("Zalo user_id chỉ nhận chữ số, tối đa 50 ký tự", () => {
    const msg = "Zalo user_id chỉ gồm chữ số (tối đa 50 ký tự)";
    expect(errorOf({ ...valid, zaloUserId: "123 456" }, "zaloUserId")).toBe(msg);
    expect(errorOf({ ...valid, zaloUserId: "abc123" }, "zaloUserId")).toBe(msg);
    expect(errorOf({ ...valid, zaloUserId: "1".repeat(51) }, "zaloUserId")).toBe(msg);
    expect(errorOf({ ...valid, zaloUserId: "1".repeat(50) }, "zaloUserId")).toBeUndefined();
  });

  it("để trống Zalo user_id vẫn hợp lệ", () => {
    expect(errorOf({ ...valid, zaloUserId: "" }, "zaloUserId")).toBeUndefined();
  });
});

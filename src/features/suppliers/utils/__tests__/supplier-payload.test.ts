import { describe, expect, it } from "vitest";
import { emptySupplierForm, supplierPayload } from "@/features/suppliers/utils/supplier-payload";

describe("supplierPayload", () => {
  it("tạo mới: bỏ các ô tuỳ chọn rỗng, cắt khoảng trắng", () => {
    const form = { ...emptySupplierForm(), name: "  ABC ", zaloUserId: " 999 " };
    expect(supplierPayload(form, "create")).toEqual({ name: "ABC", zaloUserId: "999" });
  });

  it("sửa: gửi đủ ô, ô rỗng gửi chuỗi rỗng để xoá giá trị cũ", () => {
    const form = { ...emptySupplierForm(), id: "5", name: "ABC", phone: "0901234567" };
    expect(supplierPayload(form, "edit")).toEqual({
      name: "ABC",
      company: "",
      phone: "0901234567",
      email: "",
      zaloUserId: "",
      note: "",
    });
  });
});

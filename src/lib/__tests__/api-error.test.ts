import { describe, expect, it } from "vitest";
import { apiErrorMessage } from "@/lib/api-error";

describe("apiErrorMessage", () => {
  it("trả message của Error", () => {
    expect(apiErrorMessage(new Error("Sai mật khẩu"), "Lỗi chung")).toBe("Sai mật khẩu");
  });

  it("giữ nguyên subclass của Error", () => {
    expect(apiErrorMessage(new TypeError("Failed to fetch"), "Lỗi chung")).toBe("Failed to fetch");
  });

  it("giá trị không phải Error thì dùng fallback", () => {
    expect(apiErrorMessage("chuỗi", "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage(null, "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage({ message: "x" }, "Lỗi chung")).toBe("Lỗi chung");
  });
});

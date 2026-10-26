import { describe, expect, it } from "vitest";
import { createCustomerSchema, patchCustomerSchema } from "@/features/customers/schemas/customer-schema";

const valid = { name: "Nguyen Van A", whatsappPhone: "84901234567" };

// Lấy message lỗi của một ô để kiểm tra đúng ô, đúng câu.
function errorOf(result: ReturnType<typeof createCustomerSchema.safeParse>, field: string) {
  if (result.success) return undefined;
  return result.error.issues.find((i) => i.path[0] === field)?.message;
}

describe.each([
  ["createCustomerSchema", createCustomerSchema],
  ["patchCustomerSchema", patchCustomerSchema],
])("%s", (_name, schema) => {
  it("chấp nhận dữ liệu tối thiểu hợp lệ", () => {
    expect(schema.safeParse(valid).success).toBe(true);
  });

  it("chấp nhận đầy đủ trường tuỳ chọn; email/phone rỗng hoặc null đều được", () => {
    expect(
      schema.safeParse({
        ...valid,
        company: "Ago",
        phone: "",
        email: "a@b.co",
        market: "Vietnam",
        status: "ACTIVE",
        receiveQuotation: true,
        note: "ghi chú",
      }).success,
    ).toBe(true);
    expect(schema.safeParse({ ...valid, phone: null, email: null }).success).toBe(true);
    expect(schema.safeParse({ ...valid, email: "" }).success).toBe(true);
  });

  it("thiếu tên thì báo đúng ô name", () => {
    const r = schema.safeParse({ ...valid, name: "   " });
    expect(errorOf(r, "name")).toBe("Vui lòng nhập tên khách");
  });

  it("tên quá 255 ký tự bị chặn", () => {
    const r = schema.safeParse({ ...valid, name: "a".repeat(256) });
    expect(errorOf(r, "name")).toBe("Tên quá dài");
  });

  it("thiếu số WhatsApp thì báo bắt buộc", () => {
    const r = schema.safeParse({ ...valid, whatsappPhone: "" });
    expect(errorOf(r, "whatsappPhone")).toBe("Vui lòng nhập số WhatsApp");
  });

  it("số WhatsApp phải toàn số, 6-15 chữ số", () => {
    for (const bad of ["12345", "1234567890123456", "+84901234567", "090 123 4567", "abc123456"]) {
      const r = schema.safeParse({ ...valid, whatsappPhone: bad });
      expect(errorOf(r, "whatsappPhone"), bad).toBe("Số WhatsApp chỉ gồm 6-15 chữ số");
    }
    expect(schema.safeParse({ ...valid, whatsappPhone: "123456" }).success).toBe(true);
    expect(schema.safeParse({ ...valid, whatsappPhone: "123456789012345" }).success).toBe(true);
  });

  it("SĐT khác sai định dạng thì báo đúng ô phone", () => {
    const r = schema.safeParse({ ...valid, phone: "12ab" });
    expect(errorOf(r, "phone")).toBe("SĐT khác chỉ gồm 6-15 chữ số");
  });

  it("email sai định dạng thì báo đúng ô email", () => {
    const r = schema.safeParse({ ...valid, email: "khong-phai-email" });
    expect(errorOf(r, "email")).toBe("Email không hợp lệ");
  });

  it("status ngoài ACTIVE/INACTIVE bị từ chối", () => {
    expect(schema.safeParse({ ...valid, status: "DELETED" }).success).toBe(false);
  });
});

describe("createCustomerSchema.templateId", () => {
  it("nhận số hoặc chuỗi (id BigInt trả về dạng chuỗi) và null", () => {
    expect(createCustomerSchema.safeParse({ ...valid, templateId: 5 }).success).toBe(true);
    expect(createCustomerSchema.safeParse({ ...valid, templateId: "5" }).success).toBe(true);
    expect(createCustomerSchema.safeParse({ ...valid, templateId: null }).success).toBe(true);
    expect(createCustomerSchema.safeParse({ ...valid, templateId: true }).success).toBe(false);
  });
});

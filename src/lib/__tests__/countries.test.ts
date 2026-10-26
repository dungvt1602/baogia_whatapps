import { describe, expect, it } from "vitest";
import { COUNTRIES, applyDial, findCountry, flagOf, splitPhone } from "@/lib/countries";

describe("COUNTRIES", () => {
  it("iso2 là duy nhất và gồm 2 chữ in hoa", () => {
    const codes = COUNTRIES.map((c) => c.iso2);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((c) => /^[A-Z]{2}$/.test(c))).toBe(true);
  });

  it("dial chỉ gồm chữ số (không có dấu +)", () => {
    expect(COUNTRIES.every((c) => /^\d+$/.test(c.dial))).toBe(true);
  });
});

describe("flagOf", () => {
  it("suy cờ emoji từ ISO2, không phân biệt hoa thường", () => {
    expect(flagOf("VN")).toBe("\u{1F1FB}\u{1F1F3}");
    expect(flagOf("vn")).toBe("\u{1F1FB}\u{1F1F3}");
  });

  it("ISO2 sai thì trả cờ trắng", () => {
    const white = flagOf("");
    expect(flagOf("VNM")).toBe(white);
    expect(flagOf("1A")).toBe(white);
  });
});

describe("findCountry", () => {
  it("tìm theo tên EN hoặc ISO2, không phân biệt hoa thường và khoảng trắng đầu/cuối", () => {
    expect(findCountry("Vietnam")?.iso2).toBe("VN");
    expect(findCountry("  vn ")?.dial).toBe("84");
    expect(findCountry("JAPAN")?.iso2).toBe("JP");
  });

  it("nhận bí danh (KOREA, USA, tiếng Việt)", () => {
    expect(findCountry("KOREA")?.iso2).toBe("KR");
    expect(findCountry("usa")?.iso2).toBe("US");
    expect(findCountry("Hàn Quốc")?.iso2).toBe("KR");
    expect(findCountry("viet nam")?.iso2).toBe("VN");
  });

  it("không nhận ra / rỗng thì trả undefined", () => {
    expect(findCountry("Atlantis")).toBeUndefined();
    expect(findCountry("")).toBeUndefined();
    expect(findCountry("   ")).toBeUndefined();
  });
});

describe("applyDial", () => {
  it("thay mã vùng cũ bằng mã mới", () => {
    expect(applyDial("84901234567", "66")).toBe("66901234567");
  });

  it("bỏ ký tự không phải số trước khi xử lý", () => {
    expect(applyDial("+84 90 123", "84")).toBe("8490123");
  });

  it("chưa có số cục bộ thì trả rỗng (không lưu mỗi mã vùng)", () => {
    expect(applyDial("", "84")).toBe("");
    expect(applyDial("84", "84")).toBe("");
  });

  it("số không có mã vùng nhận ra được thì chỉ gắn thêm mã mới", () => {
    expect(applyDial("0901234567", "84")).toBe("840901234567");
  });
});

describe("splitPhone", () => {
  it("rỗng / null / undefined thì trả dial và local rỗng", () => {
    expect(splitPhone("")).toEqual({ dial: "", local: "" });
    expect(splitPhone(null)).toEqual({ dial: "", local: "" });
    expect(splitPhone(undefined)).toEqual({ dial: "", local: "" });
    expect(splitPhone("abc")).toEqual({ dial: "", local: "" });
  });

  it("tách theo mã vùng của quốc gia (market) khi số khớp", () => {
    expect(splitPhone("84901234567", "Vietnam")).toEqual({ dial: "84", local: "901234567" });
  });

  it("market không khớp số thì rơi về dò theo danh sách mã vùng", () => {
    expect(splitPhone("66812345678", "Vietnam")).toEqual({ dial: "66", local: "812345678" });
  });

  it("không có market vẫn tách được và ưu tiên mã vùng dài nhất", () => {
    expect(splitPhone("+1 242 555 0100")).toEqual({ dial: "1242", local: "5550100" });
    expect(splitPhone("14155550123")).toEqual({ dial: "1", local: "4155550123" });
  });

  it("số không bắt đầu bằng mã vùng nào thì dial rỗng, local là toàn bộ số", () => {
    expect(splitPhone("0901234567")).toEqual({ dial: "", local: "0901234567" });
  });
});

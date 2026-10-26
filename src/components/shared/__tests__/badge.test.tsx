import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ZaloReachBadge, zaloReach } from "@/components/shared/badge";

describe("zaloReach / ZaloReachBadge", () => {
  it("phân loại: có user_id > chỉ có SĐT > không có gì (khoảng trắng coi như rỗng)", () => {
    expect(zaloReach({ phone: "0901", zaloUserId: "123" })).toBe("id");
    expect(zaloReach({ phone: "0901", zaloUserId: null })).toBe("phone");
    expect(zaloReach({ phone: "  ", zaloUserId: " " })).toBe("none");
    expect(zaloReach({})).toBe("none");
  });

  it("badge: none = cảnh báo, phone = Gửi bằng SĐT, id = không hiện gì", () => {
    const { rerender, container } = render(<ZaloReachBadge reach="none" />);
    expect(screen.getByText("Chưa có SĐT/Zalo")).toBeTruthy();
    rerender(<ZaloReachBadge reach="phone" />);
    expect(screen.getByText("Gửi bằng SĐT")).toBeTruthy();
    rerender(<ZaloReachBadge reach="id" />);
    expect(container.textContent).toBe("");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { RfqDetail } from "@/features/supplier-rfqs/types";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

import RfqDetailScreen from "@/features/supplier-rfqs/components/rfq-detail-screen";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });
const detail = (over: Partial<RfqDetail> = {}): RfqDetail => ({
  id: "5",
  code: "RFQ-2026-0005",
  title: "Cam sành",
  note: null,
  currency: "VND",
  deadline: null,
  status: "DRAFT",
  hasImage: false,
  createdAt: "2026-10-01T00:00:00Z",
  items: [{ id: "1", no: 1, product: "Cam", spec: null, unit: "kg", quantity: "10", note: null }],
  invitations: [],
  ...over,
});

function stub(d: RfqDetail) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    const method = init?.method ?? "GET";
    if (url === "/api/supplier-rfqs/5" && method === "GET") return Promise.resolve(json(d));
    if (url === "/api/supplier-rfqs/5/close") return Promise.resolve(json({ ...d, status: "CLOSED" }));
    if (url === "/api/supplier-rfqs/5" && method === "DELETE") return Promise.resolve(json({ ok: true }));
    if (url === "/api/suppliers") return Promise.resolve(json([{ id: "1", name: "NCC A", company: null, zaloUserId: "111" }]));
    return Promise.reject(new Error(`URL lạ ${method} ${url}`));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
  push.mockClear();
});

describe("RfqDetailScreen", () => {
  it("DRAFT: sửa được mặt hàng, có nút Thêm dòng/Lưu mặt hàng/Xóa", async () => {
    stub(detail());
    render(<RfqDetailScreen rfqId="5" />);
    const input = (await screen.findByLabelText("Mặt hàng dòng 1")) as HTMLInputElement;
    expect(input.disabled).toBe(false);
    expect(screen.getByText("+ Thêm dòng")).toBeTruthy();
    expect(screen.getByText("Lưu mặt hàng")).toBeTruthy();
    expect(screen.getByText("Xóa")).toBeTruthy();
  });

  it("SENT: mặt hàng bị khoá, không có Thêm dòng/Lưu mặt hàng/Xóa", async () => {
    stub(detail({ status: "SENT" }));
    render(<RfqDetailScreen rfqId="5" />);
    const input = (await screen.findByLabelText("Mặt hàng dòng 1")) as HTMLInputElement;
    expect(input.disabled).toBe(true);
    expect(screen.queryByText("+ Thêm dòng")).toBeNull();
    expect(screen.queryByText("Lưu mặt hàng")).toBeNull();
    expect(screen.queryByText("Xóa")).toBeNull();
    expect(screen.getByText(/Chỉ sửa được mặt hàng khi báo giá còn ở trạng thái Nháp/)).toBeTruthy();
  });

  it("sửa mặt hàng chưa lưu thì chặn gửi và giải thích", async () => {
    stub(detail());
    render(<RfqDetailScreen rfqId="5" />);
    const input = await screen.findByLabelText("Mặt hàng dòng 1");
    const supplier = (await screen.findByLabelText("Chọn NCC A")) as HTMLInputElement;
    expect(supplier.disabled).toBe(false);
    fireEvent.change(input, { target: { value: "Cam sành loại 1" } });
    expect(screen.getByText(/chưa lưu — hãy bấm “Lưu mặt hàng”/)).toBeTruthy();
    expect((screen.getByLabelText("Chọn NCC A") as HTMLInputElement).disabled).toBe(true);
  });

  it("Đóng báo giá cần xác nhận rồi gọi POST /close", async () => {
    const fn = stub(detail({ status: "SENT" }));
    render(<RfqDetailScreen rfqId="5" />);
    await screen.findByLabelText("Mặt hàng dòng 1");
    fireEvent.click(screen.getByText("Đóng báo giá"));
    expect(fn.mock.calls.some((c) => c[0].endsWith("/close"))).toBe(false); // chưa gọi khi chưa xác nhận
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Đóng báo giá" }));
    await waitFor(() => expect(fn.mock.calls.some((c) => c[0] === "/api/supplier-rfqs/5/close" && c[1]?.method === "POST")).toBe(true));
  });

  it("Xóa (DRAFT) cần xác nhận, xong quay về danh sách", async () => {
    const fn = stub(detail());
    render(<RfqDetailScreen rfqId="5" />);
    await screen.findByLabelText("Mặt hàng dòng 1");
    fireEvent.click(screen.getByText("Xóa"));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/bao-gia-ncc"));
    expect(fn.mock.calls.some((c) => c[0] === "/api/supplier-rfqs/5" && c[1]?.method === "DELETE")).toBe(true);
  });

  it("CLOSED: ảnh không đổi được, có giải thích", async () => {
    stub(detail({ status: "CLOSED", hasImage: true }));
    render(<RfqDetailScreen rfqId="5" />);
    await screen.findByLabelText("Mặt hàng dòng 1");
    expect((screen.getByText("Thay ảnh") as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText("Báo giá đã đóng nên không đổi được ảnh.")).toBeTruthy();
  });
});

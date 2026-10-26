import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import PublicQuotePage from "@/features/supplier-rfqs/public/public-quote-page";
import type { PublicRfq } from "@/features/supplier-rfqs/types";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

const data: PublicRfq = {
  rfq: { code: "RFQ-2026-0001", title: "Báo giá cam sành", note: "Giao tại kho Cần Thơ", currency: "VND", deadline: null, hasImage: false, imageUrl: null },
  supplierName: "NCC Minh Phát",
  isTest: false,
  expired: false,
  canSubmit: true,
  items: [{ id: "11", no: 1, product: "Cam sành loại 1", spec: null, unit: "kg", quantity: "100", note: null }],
  quote: null,
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("PublicQuotePage", () => {
  it("link sai (404) hiện thông báo không hợp lệ, không có form", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Link không hợp lệ hoặc đã hết hạn." }, 404)));
    render(<PublicQuotePage token="bad" />);
    await screen.findByText("Link không hợp lệ hoặc đã hết hạn.");
    expect(screen.queryByText("Gửi báo giá")).toBeNull();
  });

  it("gọi đúng URL công khai (mã hoá token) và hiện thông tin RFQ + ruy băng chế độ thử", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ...data, isTest: true }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicQuotePage token="a/b" />);
    await screen.findByText("Báo giá cam sành");
    expect(fetchMock).toHaveBeenCalledWith("/api/public/supplier-rfq/a%2Fb");
    expect(screen.getByText(/Chế độ thử/)).toBeTruthy();
    expect(screen.getByText("Cam sành loại 1")).toBeTruthy();
    expect(screen.getByText("NCC Minh Phát")).toBeTruthy();
  });

  it("quá hạn / canSubmit=false: chỉ đọc, không có nút gửi, ô nhập bị khoá", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ...data, expired: true, canSubmit: false })));
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Đã quá hạn báo giá.");
    expect(screen.queryByText("Gửi báo giá")).toBeNull();
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs.every((i) => i.disabled)).toBe(true);
  });

  it("chặn gửi khi chưa nhập giá nào và không gọi POST", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(data));
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicQuotePage token="t" />);
    fireEvent.click(await screen.findByText("Gửi báo giá"));
    await screen.findByText("Vui lòng nhập đơn giá cho ít nhất một mặt hàng.");
    expect(fetchMock).toHaveBeenCalledTimes(1); // chỉ lần GET ban đầu
  });

  it("nhập giá, gửi thành công: POST đúng payload và hiện phiên bản", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(data))
      .mockResolvedValueOnce(jsonResponse({ ok: true, version: 3 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicQuotePage token="tok" />);
    await screen.findByText("Báo giá cam sành");
    fireEvent.change(screen.getByPlaceholderText("VD: 25000"), { target: { value: "25000" } });
    fireEvent.click(screen.getByText("Gửi báo giá"));
    await screen.findByText(/phiên bản 3/);
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/public/supplier-rfq/tok/quote");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ currency: "VND", items: [{ rfqItemId: "11", unitPrice: "25000" }] });
    expect(screen.getByText("Cập nhật báo giá")).toBeTruthy();
  });

  it("429 hiện thông báo ngay tại form", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(data))
        .mockResolvedValueOnce(jsonResponse({ error: "Thao tác quá nhanh, thử lại sau." }, 429)),
    );
    render(<PublicQuotePage token="tok" />);
    await screen.findByText("Báo giá cam sành");
    fireEvent.change(screen.getByPlaceholderText("VD: 25000"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Gửi báo giá"));
    await waitFor(() => expect(screen.getByText("Thao tác quá nhanh, thử lại sau.")).toBeTruthy());
  });

  it("điền sẵn giá đã nộp trước đó", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ ...data, quote: { version: 2, currency: "VND", validUntil: null, note: null, items: [{ rfqItemId: "11", unitPrice: "24000", moq: null, leadTimeDays: null, note: null }] } }),
      ),
    );
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Báo giá cam sành");
    expect((screen.getByPlaceholderText("VD: 25000") as HTMLInputElement).value).toBe("24000");
    expect(screen.getByText("Cập nhật báo giá")).toBeTruthy();
  });
  it("bấm gửi hai lần liên tiếp chỉ gọi POST một lần", async () => {
    let resolvePost: (r: Response) => void = () => {};
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(data))
      .mockReturnValueOnce(new Promise<Response>((r) => (resolvePost = r)));
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicQuotePage token="tok" />);
    await screen.findByText("Báo giá cam sành");
    fireEvent.change(screen.getByPlaceholderText("VD: 25000"), { target: { value: "5" } });
    const btn = screen.getByText("Gửi báo giá");
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(fetchMock).toHaveBeenCalledTimes(2); // GET + đúng 1 POST
    resolvePost(jsonResponse({ ok: true, version: 1 }));
    await screen.findByText(/phiên bản 1/);
  });

  it("hiện 'Đơn giá hiểu là' khi gõ, và báo mơ hồ ngay với 25.000", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(data)));
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Báo giá cam sành");
    const input = screen.getByPlaceholderText("VD: 25000");
    fireEvent.change(input, { target: { value: "25000" } });
    expect(screen.getByTestId("interpreted").textContent).toBe("Đơn giá hiểu là: 25.000 VND");
    fireEvent.change(input, { target: { value: "25.000" } });
    expect(screen.queryByTestId("interpreted")).toBeNull();
    expect(screen.getByText(/Dấu phân cách không rõ/)).toBeTruthy();
  });

  it("tiền tệ chỉ đọc theo RFQ và payload dùng tiền tệ RFQ", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...data, rfq: { ...data.rfq, currency: "USD" } }))
      .mockResolvedValueOnce(jsonResponse({ ok: true, version: 1 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Báo giá cam sành");
    const cur = screen.getByLabelText("Tiền tệ") as HTMLInputElement;
    expect(cur.value).toBe("USD");
    expect(cur.readOnly).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("VD: 25000"), { target: { value: "2.5" } });
    fireEvent.click(screen.getByText("Gửi báo giá"));
    await screen.findByText(/phiên bản 1/);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).currency).toBe("USD");
  });

  it("502 HTML khi tải: hiện lỗi chung có nút Thử lại (không phải link sai)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 })));
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Có lỗi xảy ra");
    expect(screen.getByText("Lỗi 502")).toBeTruthy();
    expect(screen.getByText("Thử lại")).toBeTruthy();
  });

  it("413 khi gửi hiện thông báo dữ liệu quá lớn", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(jsonResponse(data)).mockResolvedValueOnce(new Response("", { status: 413 })));
    render(<PublicQuotePage token="t" />);
    await screen.findByText("Báo giá cam sành");
    fireEvent.change(screen.getByPlaceholderText("VD: 25000"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Gửi báo giá"));
    await screen.findByText(/Dữ liệu gửi lên quá lớn/);
  });
});

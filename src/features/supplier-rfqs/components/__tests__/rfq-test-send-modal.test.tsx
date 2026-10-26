import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import RfqTestSendModal, { TestSendResultView, safeHref } from "@/features/supplier-rfqs/components/rfq-test-send-modal";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

// fetch giả theo URL: danh sách nhân viên + kết quả test-send.
function stubFetch(testSend: () => Response) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    void init;
    if (url === "/api/supplier-rfqs/test-recipients") {
      return Promise.resolve(jsonResponse([{ userId: "7", name: "Lê Ngọc Anh", zaloUserId: "zalo-777" }]));
    }
    if (url === "/api/supplier-rfqs/42/test-send") return Promise.resolve(testSend());
    return Promise.reject(new Error("URL không mong đợi: " + url));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RfqTestSendModal", () => {
  it("chọn nhân viên, gửi thử thành công: hiện mode, link và phản hồi thô của Zalo", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ ok: true, mode: "list", link: "https://app.example.com/ncc/abc", zalo: { error: 0, message: "Success" } }));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);

    await screen.findByText("Lê Ngọc Anh — zalo-777");
    const send = screen.getByText("Gửi thử") as HTMLButtonElement;
    expect(send.disabled).toBe(true); // chưa chọn ai

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "zalo-777" } });
    expect(send.disabled).toBe(false);
    fireEvent.click(send);

    await screen.findByText("Gửi thử THÀNH CÔNG");
    expect(screen.getByText("list")).toBeTruthy();
    expect(screen.getByText("https://app.example.com/ncc/abc")).toBeTruthy();
    expect(screen.getByText("Mở thử form").getAttribute("href")).toBe("https://app.example.com/ncc/abc");
    expect(screen.getByTestId("test-send-result").textContent).toContain('"message": "Success"');

    const post = fetchMock.mock.calls.find((c) => c[0] === "/api/supplier-rfqs/42/test-send");
    expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({ zaloUserId: "zalo-777" });
  });

  it("ô nhập tay ưu tiên hơn dropdown; lỗi từ Zalo hiện thất bại kèm nội dung lỗi", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ ok: false, mode: "text", error: "User chưa quan tâm OA", zalo: { error: -230 } }));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);
    await screen.findByText("Lê Ngọc Anh — zalo-777");
    fireEvent.change(screen.getByPlaceholderText("VD: 0901234567 hoặc 2512345678901234567"), { target: { value: " 999 " } });
    fireEvent.click(screen.getByText("Gửi thử"));

    await screen.findByText("Gửi thử THẤT BẠI");
    expect(screen.getAllByText("User chưa quan tâm OA").length).toBeGreaterThan(0);
    expect(screen.getByTestId("test-send-result").textContent).toContain('"error": -230');
    const post = fetchMock.mock.calls.find((c) => c[0] === "/api/supplier-rfqs/42/test-send");
    expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({ zaloUserId: "999" });
  });

  it("HTTP lỗi (400) cũng hiện là thất bại với thông báo của BE", async () => {
    stubFetch(() => jsonResponse({ error: "Zalo OA chưa kết nối" }, 400));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);
    await screen.findByText("Lê Ngọc Anh — zalo-777");
    fireEvent.change(screen.getByPlaceholderText("VD: 0901234567 hoặc 2512345678901234567"), { target: { value: "1" } });
    fireEvent.click(screen.getByText("Gửi thử"));
    await waitFor(() => expect(screen.getByText("Gửi thử THẤT BẠI")).toBeTruthy());
    expect(screen.getAllByText("Zalo OA chưa kết nối").length).toBeGreaterThan(0);
  });
});

describe("RfqTestSendModal — lỗi HTTP có body chẩn đoán và validate user_id", () => {
  it("HTTP 400 mang zalo + listError: vẫn hiện hộp chẩn đoán đầy đủ", async () => {
    stubFetch(() => jsonResponse({ error: "Zalo từ chối tin", listError: "Template element invalid", mode: "text", zalo: { error: -201 } }, 400));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);
    await screen.findByText("Lê Ngọc Anh — zalo-777");
    fireEvent.change(screen.getByPlaceholderText("VD: 0901234567 hoặc 2512345678901234567"), { target: { value: "123" } });
    fireEvent.click(screen.getByText("Gửi thử"));
    await screen.findByText("Gửi thử THẤT BẠI");
    const box = screen.getByTestId("test-send-result").textContent;
    expect(box).toContain("Định dạng list bị Zalo từ chối: Template element invalid");
    expect(box).toContain("Zalo từ chối tin");
    expect(box).toContain('"error": -201');
  });

  it("user_id nhập tay phải toàn chữ số: sai thì báo và khoá nút", async () => {
    stubFetch(() => jsonResponse({ ok: true }));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);
    await screen.findByText("Lê Ngọc Anh — zalo-777");
    fireEvent.change(screen.getByPlaceholderText("VD: 0901234567 hoặc 2512345678901234567"), { target: { value: "abc123" } });
    expect(screen.getByText(/Nhập Zalo user_id \(chữ số\) hoặc SĐT/)).toBeTruthy();
    expect((screen.getByText("Gửi thử") as HTMLButtonElement).disabled).toBe(true);
  });

  it("nhận cả SĐT (có +, dấu cách, chấm, gạch) lẫn user_id; gửi nguyên giá trị đã cắt khoảng trắng đầu/cuối", async () => {
    const fetchMock = stubFetch(() => jsonResponse({ ok: true, mode: "list", resolvedUserId: "55501234", zalo: { error: 0 } }));
    render(<RfqTestSendModal rfqId="42" onClose={() => {}} />);
    await screen.findByText("Lê Ngọc Anh — zalo-777");
    const input = screen.getByPlaceholderText("VD: 0901234567 hoặc 2512345678901234567");
    for (const v of ["+84 901.234-567", "0901234567", "2512345678901234567"]) {
      fireEvent.change(input, { target: { value: v } });
      expect((screen.getByText("Gửi thử") as HTMLButtonElement).disabled, v).toBe(false);
    }
    for (const v of ["abc", "090-abc", "1".repeat(51), "+"]) {
      fireEvent.change(input, { target: { value: v } });
      expect((screen.getByText("Gửi thử") as HTMLButtonElement).disabled, v).toBe(true);
    }
    fireEvent.change(input, { target: { value: " +84 901.234-567 " } });
    fireEvent.click(screen.getByText("Gửi thử"));
    await screen.findByText("Gửi thử THÀNH CÔNG");
    expect(screen.getByText("55501234")).toBeTruthy();
    expect(screen.getByTestId("test-send-result").textContent).toContain("SĐT đã tra ra Zalo user_id: 55501234");
    const post = fetchMock.mock.calls.find((c) => c[0] === "/api/supplier-rfqs/42/test-send");
    expect(JSON.parse((post?.[1] as RequestInit).body as string)).toEqual({ zaloUserId: "+84 901.234-567" });
  });
});

describe("TestSendResultView / safeHref", () => {
  it("chỉ cho mở link http/https", () => {
    expect(safeHref("https://a.com/x")).toBe("https://a.com/x");
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref(undefined)).toBeNull();
  });

  it("link lạ không có nút Mở thử form", () => {
    render(<TestSendResultView outcome={{ kind: "result", data: { ok: true, mode: "text", link: "javascript:alert(1)" } }} />);
    expect(screen.queryByText("Mở thử form")).toBeNull();
  });
});

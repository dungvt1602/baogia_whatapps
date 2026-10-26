import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import RfqSendCard from "@/features/supplier-rfqs/components/rfq-send-card";
import type { RfqInvitation } from "@/features/supplier-rfqs/types";

const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status });

const suppliers = [
  { id: "1", name: "NCC A", company: null, zaloUserId: "111" },
  { id: "2", name: "NCC B", company: null, zaloUserId: "222" },
  { id: "3", name: "NCC C", company: null, zaloUserId: null },
];
const invitedB: RfqInvitation = { id: "9", supplierId: "2", supplierName: "NCC B", status: "SENT", isTest: false, sentAt: null, viewedAt: null, submittedAt: null, error: null };

function stub(sendResponse: unknown = { results: [] }) {
  const fn = vi.fn((url: string, init?: RequestInit) => {
    void init;
    if (url === "/api/suppliers") return Promise.resolve(json(suppliers));
    if (url === "/api/supplier-rfqs/5/send") return Promise.resolve(json(sendResponse));
    return Promise.reject(new Error("URL lạ " + url));
  });
  vi.stubGlobal("fetch", fn);
  return fn;
}
const sentBody = (fn: ReturnType<typeof stub>) => {
  const c = fn.mock.calls.find((x) => x[0] === "/api/supplier-rfqs/5/send");
  return c ? JSON.parse(c[1]?.body as string) : null;
};
const renderCard = (extra: Partial<React.ComponentProps<typeof RfqSendCard>> = {}) =>
  render(<RfqSendCard rfqId="5" invitations={[invitedB]} canSend onSent={() => {}} {...extra} />);

afterEach(() => vi.unstubAllGlobals());

describe("RfqSendCard", () => {
  it("NCC không có Zalo user_id bị khoá và có badge cảnh báo", async () => {
    stub();
    renderCard();
    const c = (await screen.findByLabelText("Chọn NCC C")) as HTMLInputElement;
    expect(c.disabled).toBe(true);
    expect(screen.getByText("Thiếu Zalo")).toBeTruthy();
    expect((screen.getByLabelText("Chọn NCC A") as HTMLInputElement).disabled).toBe(false);
  });

  it("chọn NCC chưa mời: không có ô gửi lại, POST không kèm resend, có hộp xác nhận", async () => {
    const fn = stub({ results: [{ supplierId: "1", supplierName: "NCC A", ok: true, status: "SENT" }] });
    renderCard();
    fireEvent.click(await screen.findByLabelText("Chọn NCC A"));
    expect(screen.queryByLabelText(/Gửi lại cho NCC đã nhận/)).toBeNull();
    fireEvent.click(screen.getByText("Gửi qua Zalo (1)"));
    const dlg = screen.getByRole("dialog");
    fireEvent.click(within(dlg).getByText("Gửi cho 1 NCC"));
    await screen.findByTestId("send-results");
    expect(sentBody(fn)).toEqual({ supplierIds: ["1"] });
  });

  it("chọn NCC đã mời + tick gửi lại: POST có resend và cảnh báo link cũ", async () => {
    const fn = stub();
    renderCard();
    fireEvent.click(await screen.findByLabelText("Chọn NCC B"));
    const box = screen.getByLabelText(/Gửi lại cho NCC đã nhận/) as HTMLInputElement;
    expect(box.closest("label")?.textContent).toContain("link cũ sẽ không dùng được nữa");
    fireEvent.click(box);
    expect(box.checked).toBe(true);
    fireEvent.click(screen.getByText("Gửi qua Zalo (1)"));
    const dlg = screen.getByRole("dialog");
    expect(dlg.textContent).toContain("link cũ của họ sẽ không dùng được nữa");
    fireEvent.click(within(dlg).getByText("Gửi cho 1 NCC"));
    await vi.waitFor(() => expect(sentBody(fn)).toEqual({ supplierIds: ["2"], resend: true }));
  });

  it("bỏ chọn NCC đã mời rồi chọn lại: tick được reset; chọn NCC chưa mời thì không gửi resend", async () => {
    const fn = stub();
    renderCard();
    const b = await screen.findByLabelText("Chọn NCC B");
    fireEvent.click(b);
    fireEvent.click(screen.getByLabelText(/Gửi lại cho NCC đã nhận/));
    fireEvent.click(b); // bỏ chọn B
    expect(screen.queryByLabelText(/Gửi lại cho NCC đã nhận/)).toBeNull();
    fireEvent.click(b); // chọn lại B
    expect((screen.getByLabelText(/Gửi lại cho NCC đã nhận/) as HTMLInputElement).checked).toBe(false);
    fireEvent.click(b); // bỏ B
    fireEvent.click(screen.getByLabelText("Chọn NCC A"));
    fireEvent.click(screen.getByText("Gửi qua Zalo (1)"));
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Gửi cho 1 NCC"));
    await vi.waitFor(() => expect(sentBody(fn)).toEqual({ supplierIds: ["1"] }));
  });

  it("kết quả ok kèm error hiện là bỏ qua (đã gửi trước đó), lỗi hiện nguyên văn", async () => {
    stub({
      results: [
        { supplierId: "1", supplierName: "NCC A", ok: true, status: "SENT", error: "Đã gửi trước đó." },
        { supplierId: "2", supplierName: "NCC B", ok: false, status: "FAILED", error: "Zalo từ chối" },
      ],
    });
    renderCard();
    fireEvent.click(await screen.findByLabelText("Chọn NCC A"));
    fireEvent.click(screen.getByLabelText("Chọn NCC B"));
    fireEvent.click(screen.getByText("Gửi qua Zalo (2)"));
    fireEvent.click(within(screen.getByRole("dialog")).getByText("Gửi cho 2 NCC"));
    const res = await screen.findByTestId("send-results");
    expect(res.textContent).toContain("NCC A — bỏ qua — Đã gửi trước đó.");
    expect(res.textContent).toContain("NCC B — Zalo từ chối");
  });

  it("canSend=false: không chọn được, nút gửi khoá và hiện lý do", async () => {
    stub();
    renderCard({ canSend: false, blockedReason: "Báo giá đã đóng" });
    expect(((await screen.findByLabelText("Chọn NCC A")) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText("Báo giá đã đóng")).toBeTruthy();
    expect((screen.getByText("Gửi qua Zalo") as HTMLButtonElement).disabled).toBe(true);
  });
});

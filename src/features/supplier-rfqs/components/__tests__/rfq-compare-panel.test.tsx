import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import RfqComparePanel from "@/features/supplier-rfqs/components/rfq-compare-panel";
import type { CompareData } from "@/features/supplier-rfqs/types";

const price = (invitationId: string, unitPrice: string) => ({ invitationId, unitPrice, moq: null, leadTimeDays: null, note: null });
const sup = (invitationId: string, name: string, currency: string) => ({
  invitationId, supplierId: invitationId, name, status: "SUBMITTED" as const, submittedAt: "2026-10-01T00:00:00Z", version: 1, currency, note: null,
});
const make = (c2: string): CompareData => ({
  rfq: { id: "1", code: "RFQ-1", title: "T", currency: "VND", deadline: null, status: "SENT" },
  suppliers: [sup("10", "A", "VND"), sup("11", "B", c2)],
  rows: [{ itemId: "1", no: 1, product: "Cam", unit: "kg", quantity: "10", prices: [price("10", "25000"), price("11", "9000")], bestInvitationId: "11" }],
});

afterEach(() => vi.unstubAllGlobals());
const stub = (d: CompareData) => vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(d), { status: 200 })));

describe("RfqComparePanel", () => {
  it("cùng tiền tệ: tô 'Thấp nhất' ở ô rẻ nhất", async () => {
    stub(make("VND"));
    render(<RfqComparePanel rfqId="1" refreshKey={0} />);
    await screen.findByText("Thấp nhất");
    expect(screen.queryByTestId("mixed-currency-note")).toBeNull();
  });

  it("khác tiền tệ: ẩn 'Thấp nhất' và hiện ghi chú", async () => {
    stub(make("USD"));
    render(<RfqComparePanel rfqId="1" refreshKey={0} />);
    await screen.findByTestId("mixed-currency-note");
    expect(screen.queryByText("Thấp nhất")).toBeNull();
  });
});

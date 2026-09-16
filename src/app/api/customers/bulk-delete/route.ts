import { handle } from "@/server/http/json";
import { deleteCustomersBulk } from "@/server/services/customerService";
import { audit } from "@/server/services/auditService";

// Xoá hàng loạt khách (nút "Xoá đã chọn" — kể cả khi chọn tất cả hàng trăm khách). Body: { ids: string[] }.
export async function POST(req: Request) {
  return handle(async () => {
    const body = (await req.json().catch(() => ({}))) as { ids?: unknown };
    const ids = Array.isArray(body.ids) ? body.ids.map(String).filter((s) => /^\d+$/.test(s)) : [];
    if (!ids.length) throw new Error("Chưa chọn khách nào.");
    const r = await deleteCustomersBulk(ids);
    await audit(req, {
      action: "KHACH_HANG_XOA",
      target: `${r.deleted} khách hàng`,
      note: r.sample.length ? `vd: ${r.sample.join(", ")}${r.deleted > r.sample.length ? "…" : ""}` : null,
    });
    return r;
  });
}

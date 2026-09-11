import { handle } from "@/server/http/json";
import { listItems, setItems } from "@/server/services/quotationService";
import { setItemsSchema } from "@/server/validation/quotation.schema";
import { audit, snapshot, labelOf } from "@/server/services/auditService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listItems(id), 500);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const items = setItemsSchema.parse(await req.json()).items;
    const before = await listItems(id).catch(() => []);
    const r = await setItems(id, items);
    const q = await snapshot("quotation", id);
    const names = items.slice(0, 5).map((it) => it.product).filter(Boolean).join(", ");
    await audit(req, {
      action: "BAO_GIA_SUA_MAT_HANG",
      target: labelOf("quotation", q, id),
      note: `${before.length} → ${items.length} mặt hàng${names ? ": " + names + (items.length > 5 ? "…" : "") : ""}`,
    });
    return r;
  });
}

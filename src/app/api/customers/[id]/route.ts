import { handle } from "@/server/http/json";
import { updateCustomer, deleteCustomer } from "@/server/services/customerService";
import { patchCustomerSchema } from "@/server/validation/customer.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = patchCustomerSchema.parse(await req.json());
    const before = await snapshot("customer", id);
    const r = await updateCustomer(id, input);
    await audit(req, { action: "KHACH_HANG_SUA", target: labelOf("customer", before, id), note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì" });
    return r;
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("customer", id);
    const r = await deleteCustomer(id);
    await audit(req, { action: "KHACH_HANG_XOA", target: labelOf("customer", before, id), note: before ? [before.phone, before.whatsappPhone, before.market].filter(Boolean).join(" · ") : null });
    return r;
  });
}

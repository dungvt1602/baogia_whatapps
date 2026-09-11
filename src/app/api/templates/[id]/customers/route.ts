import { handle } from "@/server/http/json";
import { listTemplateCustomers } from "@/server/services/templateService";
import { createCustomer } from "@/server/services/customerService";
import { createCustomerSchema } from "@/server/validation/customer.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listTemplateCustomers(id), 500);
}

// Tạo khách gắn thẳng vào template này.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = createCustomerSchema.parse(await req.json());
    const c = await createCustomer({ ...input, templateId: id });
    const t = await snapshot("template", id);
    await audit(req, {
      action: "KHACH_HANG_TAO",
      target: labelOf("customer", c as unknown as Record<string, unknown>),
      note: `gắn vào template ${labelOf("template", t, id)}; ${diffSummary(null, input as Record<string, unknown>)}`,
    });
    return c;
  });
}

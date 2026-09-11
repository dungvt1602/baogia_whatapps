import { handle } from "@/server/http/json";
import { addCustomerToTemplate, removeCustomerFromTemplate } from "@/server/services/customerService";
import { audit, snapshot, labelOf } from "@/server/services/auditService";

// Gắn 1 khách hiện có vào template (tạo link N-N).
export async function POST(req: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  const { id, customerId } = await params;
  return handle(async () => {
    const r = await addCustomerToTemplate(id, customerId);
    const [t, c] = await Promise.all([snapshot("template", id), snapshot("customer", customerId)]);
    await audit(req, { action: "TEMPLATE_GAN_KHACH", target: labelOf("template", t, id), note: labelOf("customer", c, customerId) });
    return r;
  });
}

// Gỡ 1 khách khỏi template (xoá link, khách vẫn còn ở template khác).
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; customerId: string }> }) {
  const { id, customerId } = await params;
  return handle(async () => {
    const [t, c] = await Promise.all([snapshot("template", id), snapshot("customer", customerId)]);
    const r = await removeCustomerFromTemplate(id, customerId);
    await audit(req, { action: "TEMPLATE_GO_KHACH", target: labelOf("template", t, id), note: labelOf("customer", c, customerId) });
    return r;
  });
}

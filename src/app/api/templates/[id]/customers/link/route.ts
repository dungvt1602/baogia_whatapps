import { handle } from "@/server/http/json";
import { linkCustomersToTemplate } from "@/server/services/templateService";
import { audit, snapshot, labelOf } from "@/server/services/auditService";

// Gắn hàng loạt khách vào template (trùng bỏ qua). Body: { customerIds: string[] }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = await req.json();
    const ids: string[] = Array.isArray(body?.customerIds) ? body.customerIds : [];
    const r = await linkCustomersToTemplate(id, ids);
    const t = await snapshot("template", id);
    await audit(req, { action: "TEMPLATE_GAN_KHACH", target: labelOf("template", t, id), note: `${ids.length} khách` });
    return r;
  });
}

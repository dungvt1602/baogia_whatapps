import { handle } from "@/server/http/json";
import { unlinkCustomersFromTemplate } from "@/server/services/templateService";
import { audit, snapshot, labelOf } from "@/server/services/auditService";

// Gỡ hàng loạt khách khỏi template (1 request cho cả trăm khách). Body: { customerIds: string[] }.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const body = await req.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.customerIds) ? body.customerIds.map(String) : [];
    const r = await unlinkCustomersFromTemplate(id, ids);
    const t = await snapshot("template", id);
    await audit(req, { action: "TEMPLATE_GO_KHACH", target: labelOf("template", t, id), note: `${r.unlinked} khách` });
    return r;
  });
}

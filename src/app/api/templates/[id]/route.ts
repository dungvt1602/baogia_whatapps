import { json, handle } from "@/server/http/json";
import { getTemplateDetail, updateTemplate, deleteTemplate } from "@/server/services/templateService";
import { updateTemplateSchema } from "@/server/validation/template.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemplateDetail(id);
  if (!t) return json({ error: "Không tìm thấy template" }, { status: 404 });
  return json(t);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = updateTemplateSchema.parse(await req.json());
    const before = await snapshot("template", id);
    const r = await updateTemplate(id, input);
    await audit(req, {
      action: "TEMPLATE_SUA",
      target: labelOf("template", before, id),
      note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì",
    });
    return r;
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("template", id);
    const r = await deleteTemplate(id);
    await audit(req, { action: "TEMPLATE_XOA", target: labelOf("template", before, id) });
    return r;
  });
}

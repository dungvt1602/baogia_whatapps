import { json, handle } from "@/server/http/json";
import { getTemplateDetail, updateTemplate, deleteTemplate } from "@/server/services/templateService";
import { updateTemplateSchema } from "@/server/validation/template.schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemplateDetail(id);
  if (!t) return json({ error: "Không tìm thấy template" }, { status: 404 });
  return json(t);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => updateTemplate(id, updateTemplateSchema.parse(await req.json())));
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteTemplate(id));
}

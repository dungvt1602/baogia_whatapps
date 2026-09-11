import { handle } from "@/server/http/json";
import { listTemplatesByQuotation, createTemplate } from "@/server/services/templateService";
import { createTemplateSchema } from "@/server/validation/template.schema";
import { audit, snapshot, labelOf } from "@/server/services/auditService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listTemplatesByQuotation(id), 500);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = createTemplateSchema.parse(await req.json());
    const t = await createTemplate(id, input);
    const q = await snapshot("quotation", id);
    await audit(req, {
      action: "TEMPLATE_TAO",
      target: labelOf("template", t as unknown as Record<string, unknown>),
      note: `thuộc báo giá ${labelOf("quotation", q, id)}${input.waTemplateName ? "; template Meta: " + input.waTemplateName : ""}`,
    });
    return t;
  });
}

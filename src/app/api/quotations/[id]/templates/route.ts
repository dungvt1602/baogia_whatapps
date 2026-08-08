import { handle } from "@/server/http/json";
import { listTemplatesByQuotation, createTemplate } from "@/server/services/templateService";
import { createTemplateSchema } from "@/server/validation/template.schema";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => listTemplatesByQuotation(id), 500);
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => createTemplate(id, createTemplateSchema.parse(await req.json())));
}

import { handle } from "@/server/http/json";
import { listTemplates, listPoolTemplates, createStandaloneTemplate } from "@/server/services/templateService";
import { createTemplateSchema } from "@/server/validation/template.schema";

export async function GET(req: Request) {
  const pool = new URL(req.url).searchParams.get("pool");
  return handle(() => (pool ? listPoolTemplates() : listTemplates()), 500);
}

export async function POST(req: Request) {
  return handle(async () => createStandaloneTemplate(createTemplateSchema.parse(await req.json())));
}

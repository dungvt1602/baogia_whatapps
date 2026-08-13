import { handle } from "@/server/http/json";
import { listTemplates, listTemplatesPaged, listPoolTemplates, createStandaloneTemplate } from "@/server/services/templateService";
import { createTemplateSchema } from "@/server/validation/template.schema";

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  if (sp.get("pool")) return handle(() => listPoolTemplates(), 500);
  // Có ?page hoặc ?search -> trả dạng phân trang { items, total, page, limit }.
  // Không có -> giữ tương thích cũ: trả nguyên mảng toàn bộ template.
  if (sp.has("page") || sp.has("search")) {
    return handle(
      () =>
        listTemplatesPaged({
          search: sp.get("search"),
          page: Number(sp.get("page")) || 1,
          limit: Number(sp.get("limit")) || 12,
        }),
      500,
    );
  }
  return handle(() => listTemplates(), 500);
}

export async function POST(req: Request) {
  return handle(async () => createStandaloneTemplate(createTemplateSchema.parse(await req.json())));
}

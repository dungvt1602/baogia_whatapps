import { json } from "@/server/http/json";
import { getTemplateDetail } from "@/server/services/templateService";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const t = await getTemplateDetail(id);
  if (!t) return json({ error: "Không tìm thấy template" }, { status: 404 });
  return json(t);
}

import { json } from "@/server/http/json";
import { getQuotationDetail } from "@/server/services/quotationService";

// GET /api/quotations/[id] — chi tiết đầy đủ 1 báo giá
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuotationDetail(id);
  if (!q) return json({ error: "Không tìm thấy báo giá" }, { status: 404 });
  return json(q);
}

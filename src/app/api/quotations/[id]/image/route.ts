import { getQuotationWithItems } from "@/server/services/quotationService";
import { renderQuotationImage } from "@/server/lib/quotationImage";

// GET /api/quotations/[id]/image — ảnh báo giá (PNG) sinh từ dữ liệu
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuotationWithItems(id);
  if (!q) return new Response("Không tìm thấy báo giá", { status: 404 });
  return renderQuotationImage(q, q.items);
}

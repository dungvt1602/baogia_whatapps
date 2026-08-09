import { json, handle } from "@/server/http/json";
import { getQuotationDetail, deleteQuotation } from "@/server/services/quotationService";

// GET /api/quotations/[id] — chi tiết đầy đủ 1 báo giá
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuotationDetail(id);
  if (!q) return json({ error: "Không tìm thấy báo giá" }, { status: 404 });
  return json(q);
}

// DELETE /api/quotations/[id] — xóa báo giá (dọn lệnh gửi, gỡ template về kho...)
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(() => deleteQuotation(id));
}

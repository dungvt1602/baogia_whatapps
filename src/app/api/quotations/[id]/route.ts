import { json, handle } from "@/server/http/json";
import { getQuotationDetail, updateQuotation, deleteQuotation } from "@/server/services/quotationService";
import { updateQuotationSchema } from "@/server/validation/quotation.schema";
import { audit, snapshot, labelOf, diffSummary } from "@/server/services/auditService";

// GET /api/quotations/[id] — chi tiết đầy đủ 1 báo giá
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const q = await getQuotationDetail(id);
  if (!q) return json({ error: "Không tìm thấy báo giá" }, { status: 404 });
  return json(q);
}

// PATCH /api/quotations/[id] — sửa thông tin báo giá (mã, tiêu đề, thị trường, hiệu lực...)
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const input = updateQuotationSchema.parse(await req.json());
    const before = await snapshot("quotation", id);
    const r = await updateQuotation(id, input);
    await audit(req, {
      action: "BAO_GIA_SUA",
      target: labelOf("quotation", before, id),
      note: diffSummary(before, input as Record<string, unknown>) || "không đổi gì",
    });
    return r;
  });
}

// DELETE /api/quotations/[id] — xóa báo giá (dọn lệnh gửi, gỡ template về kho...)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const before = await snapshot("quotation", id);
    const r = await deleteQuotation(id);
    await audit(req, { action: "BAO_GIA_XOA", target: labelOf("quotation", before, id) });
    return r;
  });
}

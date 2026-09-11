import { handle } from "@/server/http/json";
import { syncTemplatesFromMeta } from "@/server/services/metaSyncService";
import { audit } from "@/server/services/auditService";

// Đồng bộ định nghĩa template từ Meta: tự set cờ nút Flow / ảnh header đúng theo
// mẫu đã duyệt trên WhatsApp Manager. Trả về chi tiết mẫu nào bị sửa gì.
export async function POST(req: Request) {
  return handle(async () => {
    const r = await syncTemplatesFromMeta();
    await audit(req, {
      action: "TEMPLATE_DONG_BO_META",
      target: "WhatsApp Manager",
      note: `kiểm ${r.checked} template, cập nhật ${r.updated}, không thấy trên Meta ${r.notFound}`,
    });
    return r;
  }, 500);
}

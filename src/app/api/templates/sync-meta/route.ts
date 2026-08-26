import { handle } from "@/server/http/json";
import { syncTemplatesFromMeta } from "@/server/services/metaSyncService";

// Đồng bộ định nghĩa template từ Meta: tự set cờ nút Flow / ảnh header đúng theo
// mẫu đã duyệt trên WhatsApp Manager. Trả về chi tiết mẫu nào bị sửa gì.
export async function POST() {
  return handle(() => syncTemplatesFromMeta(), 500);
}

import { handle } from "@/server/http/json";
import { listZaloSenders } from "@/server/services/zaloSenderService";

// Những người đã nhắn/quan tâm OA gần đây (user_id + tên) — để admin bấm 1 nút thêm làm kênh nhận
// (đích báo sếp) thay vì phải tự mò user_id.
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(() => listZaloSenders(), 500);
}

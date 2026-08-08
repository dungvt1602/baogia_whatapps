import { handle } from "@/server/http/json";
import { processNextBatch } from "@/server/services/sendService";

// POST /api/send/process — xử lý batch tiếp theo trong hàng đợi (cron/thủ công).
export async function POST() {
  return handle(() => processNextBatch(), 500);
}

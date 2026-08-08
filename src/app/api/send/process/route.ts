import { processNextBatch } from "@/lib/send/flow";
import { jsonBig } from "@/lib/json";

// POST /api/send/process — xử lý batch tiếp theo trong hàng đợi.
// Dùng khi muốn kích worker thủ công / qua cron (ngoài worker chạy nền).
export async function POST() {
  try {
    const result = await processNextBatch();
    return jsonBig(result);
  } catch (err) {
    return jsonBig({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

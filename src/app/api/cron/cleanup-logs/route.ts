import { handle } from "@/server/http/json";
import { cleanupSuccessLogs } from "@/server/services/activityService";

// Dọn log gửi thành công quá 3 ngày. Chạy tự động ~2h sáng (instrumentation),
// route này để gọi thủ công hoặc cho cron ngoài (serverless) kích hoạt.
async function run() {
  const deleted = await cleanupSuccessLogs(3);
  return { ok: true, deleted };
}

export async function GET() {
  return handle(run, 500);
}
export async function POST() {
  return handle(run, 500);
}

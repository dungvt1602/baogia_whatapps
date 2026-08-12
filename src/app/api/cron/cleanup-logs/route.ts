import { handle } from "@/server/http/json";
import { cleanupSuccessLogs } from "@/server/services/activityService";
import { cleanupSendJobs } from "@/server/services/sendJobService";
import { cleanupInbound } from "@/server/services/inboundService";

// Dọn log quá 3 ngày. Chạy tự động ~2h sáng (instrumentation),
// route này để gọi thủ công hoặc cho cron ngoài (serverless) kích hoạt.
// - activity_logs: chỉ xóa log THÀNH CÔNG (giữ log lỗi để soát).
// - send_jobs: xóa HẾT dù thành công hay thất bại.
// - inbound_messages: xóa HẾT phản hồi khách quá 3 ngày.
async function run() {
  const activityDeleted = await cleanupSuccessLogs(3);
  const sendJobsDeleted = await cleanupSendJobs(3);
  const inboundDeleted = await cleanupInbound(3);
  return { ok: true, activityDeleted, sendJobsDeleted, inboundDeleted };
}

export async function GET() {
  return handle(run, 500);
}
export async function POST() {
  return handle(run, 500);
}

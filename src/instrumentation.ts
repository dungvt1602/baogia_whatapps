// Worker gửi báo giá chạy nền (≈ startWhatsAppQueueWorker của bot).
// Next.js gọi register() 1 lần khi server khởi động (runtime nodejs).

export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.SEND_WORKER_DISABLED === "true") return;

  // Bỏ qua nếu chưa cấu hình DB thật (tránh spam lỗi khi DATABASE_URL còn placeholder).
  const dbUrl = process.env.DATABASE_URL || "";
  if (!dbUrl || dbUrl.includes("placeholder") || dbUrl.includes("[PROJECT-REF]")) {
    console.warn("[sendWorker] Bỏ qua: DATABASE_URL chưa cấu hình thật.");
    return;
  }

  const pollMs = Number(process.env.SEND_WORKER_POLL_MS || 8000);
  const { processNextBatch } = await import("@/server/services/sendService");

  let running = false;
  setInterval(() => {
    if (running) return;
    running = true;
    processNextBatch()
      .catch((err) => console.error("[sendWorker] error:", err))
      .finally(() => {
        running = false;
      });
  }, pollMs);

  console.log(`[sendWorker] started, poll ${pollMs}ms`);

  // Dọn định kỳ: mỗi 10 PHÚT xóa log/phản hồi quá 3 ngày (bỏ điều kiện 2h sáng).
  // Xóa an toàn khi lặp lại: chỉ đụng bản ghi đã quá 3 ngày, đa số lần chạy xóa 0 dòng.
  const { cleanupSuccessLogs } = await import("@/server/services/activityService");
  const { cleanupSendJobs } = await import("@/server/services/sendJobService");
  const { cleanupInbound } = await import("@/server/services/inboundService");
  let cleaning = false;
  const runCleanup = async () => {
    if (cleaning) return; // tránh chồng lần chạy trước chưa xong
    cleaning = true;
    try {
      const a = await cleanupSuccessLogs(3); // activity_logs SUCCESS > 3 ngày
      const b = await cleanupSendJobs(3); // send_jobs tất cả > 3 ngày
      const c = await cleanupInbound(3); // inbound_messages tất cả > 3 ngày
      if (a || b || c) console.log(`[logCleanup] xóa >3 ngày -> activity:${a} send_jobs:${b} inbound:${c}`);
    } catch (err) {
      console.error("[logCleanup] error:", err);
    } finally {
      cleaning = false;
    }
  };
  setInterval(runCleanup, 10 * 60 * 1000); // mỗi 10 phút
  console.log("[logCleanup] chạy mỗi 10 phút (xóa >3 ngày)");
}

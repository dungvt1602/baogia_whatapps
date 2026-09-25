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

  // NÓI TO chế độ gửi ngay lúc khởi động. Gửi giả không gọi Meta nhưng job vẫn đánh "Đã gửi",
  // nên nếu cấu hình sai mà không có dòng log này thì không cách nào biết cho tới khi khách hỏi
  // "sao chưa thấy báo giá".
  const { isDryRun } = await import("@/server/lib/whatsapp");
  if (isDryRun()) {
    console.warn(
      `[sendWorker] ⚠️  CHẾ ĐỘ GỬI GIẢ (SEND_DRY_RUN=${JSON.stringify(process.env.SEND_DRY_RUN ?? "")}). ` +
        `KHÔNG có tin nào được gửi tới khách, nhưng log vẫn hiện "Đã gửi". Đặt SEND_DRY_RUN=false để gửi thật.`,
    );
  } else {
    console.log("[sendWorker] Chế độ GỬI THẬT — tin sẽ được gửi tới khách hàng.");
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
  const { cleanupSendJobs, cleanupStalePreviewBatches } = await import("@/server/services/sendJobService");
  const { cleanupInbound } = await import("@/server/services/inboundService");
  let cleaning = false;
  const runCleanup = async () => {
    if (cleaning) return; // tránh chồng lần chạy trước chưa xong
    cleaning = true;
    try {
      const a = await cleanupSuccessLogs(3); // activity_logs SUCCESS > 3 ngày
      const b = await cleanupSendJobs(3); // send_jobs tất cả > 3 ngày
      const c = await cleanupInbound(3); // inbound_messages tất cả > 3 ngày
      const d = await cleanupStalePreviewBatches(1); // lệnh xem trước bỏ dở > 1 ngày (không có job)
      if (a || b || c || d) console.log(`[logCleanup] xóa -> activity:${a} send_jobs:${b} inbound:${c} preview_bo_do:${d}`);
    } catch (err) {
      console.error("[logCleanup] error:", err);
    } finally {
      cleaning = false;
    }
  };
  setInterval(runCleanup, 10 * 60 * 1000); // mỗi 10 phút
  console.log("[logCleanup] chạy mỗi 10 phút (xóa >3 ngày)");

  // Làm mới token Zalo OA (≈ job zalo-token-refresher của worker Go): mỗi 5 PHÚT kiểm expires_at
  // trong DB, còn < 10 phút thì đổi refresh_token lấy cặp mới. Chưa kết nối Zalo -> không làm gì.
  // Ngoài ra token còn được làm mới "lười" ngay lúc gửi tin + qua /api/cron/zalo-token (kiểu kéo),
  // nên kể cả server ngủ dài ngày (Render free) vẫn tự hồi khi thức dậy.
  const { ensureZaloTokenFresh } = await import("@/server/services/zaloTokenService");
  void ensureZaloTokenFresh(true);
  setInterval(() => void ensureZaloTokenFresh(true), 5 * 60 * 1000);
  console.log("[zaloToken] job làm mới token Zalo OA chạy mỗi 5 phút");
}

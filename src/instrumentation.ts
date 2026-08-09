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

  // Dọn nhật ký lúc ~2h sáng (giờ VN): xóa log gửi thành công quá 3 ngày.
  const { cleanupSuccessLogs } = await import("@/server/services/activityService");
  let lastCleanupDay = "";
  const vnNow = () => {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false,
    }).formatToParts(new Date());
    const o: Record<string, string> = {};
    parts.forEach((p) => (o[p.type] = p.value));
    return { day: `${o.year}-${o.month}-${o.day}`, hour: Number(o.hour) };
  };
  setInterval(async () => {
    const { day, hour } = vnNow();
    if (hour === 2 && lastCleanupDay !== day) {
      lastCleanupDay = day;
      try {
        const n = await cleanupSuccessLogs(3);
        console.log(`[logCleanup] xóa ${n} log gửi thành công quá 3 ngày`);
      } catch (err) {
        console.error("[logCleanup] error:", err);
      }
    }
  }, 15 * 60 * 1000); // kiểm tra mỗi 15 phút

  console.log("[logCleanup] scheduled ~02:00 (Asia/Ho_Chi_Minh)");
}

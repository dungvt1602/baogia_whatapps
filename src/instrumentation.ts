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
}

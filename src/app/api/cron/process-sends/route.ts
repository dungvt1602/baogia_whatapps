import { handle } from "@/server/http/json";
import { processNextBatch } from "@/server/services/sendService";
import { ensureZaloTokenFresh } from "@/server/services/zaloTokenService";

// Xử lý hàng đợi gửi theo KIỂU KÉO (pull): mỗi lần cron/pinger gọi vào -> gửi 1 loạt lệnh.
// Vì chạy trong REQUEST (event loop chắc chắn hoạt động), không phụ thuộc setInterval nền
// vốn chập chờn trên Render free. Gọi endpoint này định kỳ (cron-job.org mỗi 1 phút) là đủ.
//
// Chạy tối đa ~40s/lần để không vượt giới hạn thời gian request của Render.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function run() {
  // Tiện thể kiểm hạn token Zalo OA (tự giới hạn 1 lần đọc DB / 5 phút — pinger gọi mỗi phút không tốn).
  void ensureZaloTokenFresh();
  const startedAt = Date.now();
  const BUDGET_MS = 40_000;
  const results: { code: string; sent: number; failed: number; status: string }[] = [];

  while (Date.now() - startedAt < BUDGET_MS) {
    const r = await processNextBatch();
    if (!r.processed) break; // hết lệnh để gửi
    results.push({ code: r.code, sent: r.sent, failed: r.failed, status: r.finalStatus });
  }

  return { ok: true, batches: results.length, results };
}

export async function GET() {
  return handle(run, 500);
}
export async function POST() {
  return handle(run, 500);
}

import { handle } from "@/server/http/json";
import { ensureZaloTokenFresh, zaloStatus } from "@/server/services/zaloTokenService";

// Kiểu KÉO (pull) cho job làm mới token Zalo — giống /api/cron/process-sends: cron/pinger ngoài
// gọi định kỳ (5-10 phút/lần là đủ) để không phụ thuộc setInterval nền trên Render free.
// Chưa có token trong DB -> không làm gì, vẫn trả ok.
export const dynamic = "force-dynamic";

async function run() {
  await ensureZaloTokenFresh(true);
  const st = await zaloStatus();
  return { ok: true, connected: st.connected, oaId: st.oaId, expiresAt: st.expiresAt, minutesLeft: st.minutesLeft };
}
export async function GET() {
  return handle(run, 500);
}
export async function POST() {
  return handle(run, 500);
}

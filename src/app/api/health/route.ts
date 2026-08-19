import { NextResponse } from "next/server";

// Endpoint nhẹ để dịch vụ ping ngoài (UptimeRobot / cron-job.org) gọi đều đặn,
// giữ Render KHÔNG ngủ -> worker gửi luôn sống. KHÔNG đụng DB để luôn trả nhanh.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ ok: true, service: "ago-baogia" });
}
export function HEAD() {
  return new NextResponse(null, { status: 200 });
}

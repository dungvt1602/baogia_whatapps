import type { NextRequest } from "next/server";

// URL gốc công khai của app (để dựng callback URL OAuth Zalo...).
// Ưu tiên APP_BASE_URL (khai tay khi chạy sau proxy lạ); không có thì suy từ header request
// (Render/Vercel đặt x-forwarded-proto=https + host thật).
export function publicBaseUrl(req: NextRequest): string {
  const env = (process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
  if (env) return env;
  const proto = req.headers.get("x-forwarded-proto") || req.nextUrl.protocol.replace(":", "") || "http";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || req.nextUrl.host;
  return `${proto}://${host}`;
}

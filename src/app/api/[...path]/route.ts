import { type NextRequest } from "next/server";

/*
 * Proxy /api/* -> backend NestJS (server-to-server).
 *
 * Vì sao dùng proxy thay vì gọi thẳng backend từ trình duyệt:
 *  - Trình duyệt chỉ nói chuyện với 1 origin (domain của FE) -> không dính CORS.
 *  - Webhook Meta/Zalo và callback OAuth Zalo vẫn trỏ về domain của FE như cũ,
 *    không phải đổi cấu hình bên Meta/Zalo.
 *  - Body được chuyển nguyên byte (webhook ký HMAC trên đúng byte gốc; upload
 *    ảnh template là body thô image/*; import file có thể nhiều MB).
 *  - Redirect (ảnh template, callback OAuth) được trả nguyên cho trình duyệt,
 *    không tự đi theo.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = (process.env.BACKEND_URL || "http://localhost:4000").replace(/\/+$/, "");

// Header gắn với kết nối/host của trình duyệt -> không chuyển tiếp lên backend.
const STRIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "accept-encoding",
  "origin",
  "referer",
  "keep-alive",
  "transfer-encoding",
  "upgrade",
]);

// Fetch đã giải nén body -> các header mô tả body cũ không còn đúng.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

type Ctx = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx): Promise<Response> {
  const { path } = await ctx.params;
  const target = `${BACKEND_URL}/api/${path.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) headers.set(key, value);
  });

  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "Không kết nối được máy chủ (backend)." }, { status: 502 });
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase();
    if (k === "set-cookie" || STRIP_RESPONSE_HEADERS.has(k)) return;
    responseHeaders.set(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) {
    responseHeaders.append("set-cookie", cookie);
  }

  // Status không được phép có body (204/205/304) và HEAD -> không gắn body.
  const noBody = req.method === "HEAD" || [101, 204, 205, 304].includes(upstream.status);
  return new Response(noBody ? null : upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;

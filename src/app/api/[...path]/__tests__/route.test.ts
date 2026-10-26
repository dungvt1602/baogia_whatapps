// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

/*
 * Proxy đọc BACKEND_URL ngay khi module được nạp -> mỗi test đặt env rồi
 * import lại module (vi.resetModules). fetch được mock, không chạm mạng.
 */
type Route = typeof import("../route");
const BACKEND = "http://backend.test:4000";

async function loadRoute(backendUrl: string = BACKEND): Promise<Route> {
  vi.resetModules();
  vi.stubEnv("BACKEND_URL", backendUrl);
  return import("../route");
}

function ctx(...path: string[]) {
  return { params: Promise.resolve({ path }) };
}

function req(url: string, init?: ConstructorParameters<typeof NextRequest>[1]) {
  return new NextRequest(`http://fe.test${url}`, init);
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function lastCall() {
  const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Headers }];
  return { url, init };
}

describe("proxy /api/*", () => {
  it("chuyển path + query lên backend, GET không có body", async () => {
    const { GET } = await loadRoute();
    await GET(req("/api/customers/search?q=an&market=VN"), ctx("customers", "search"));

    const { url, init } = lastCall();
    expect(url).toBe(`${BACKEND}/api/customers/search?q=an&market=VN`);
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
  });

  it("bỏ dấu / cuối của BACKEND_URL", async () => {
    const { GET } = await loadRoute(`${BACKEND}///`);
    await GET(req("/api/health"), ctx("health"));
    expect(lastCall().url).toBe(`${BACKEND}/api/health`);
  });

  it("BACKEND_URL rỗng thì mặc định http://localhost:4000", async () => {
    const { GET } = await loadRoute("");
    await GET(req("/api/health"), ctx("health"));
    expect(lastCall().url).toBe("http://localhost:4000/api/health");
  });

  it("chuyển nguyên byte body và method", async () => {
    const { POST } = await loadRoute();
    const bytes = new Uint8Array([0, 255, 1, 2, 128, 10]);
    await POST(
      req("/api/templates/7/image", { method: "POST", body: bytes, headers: { "content-type": "image/png" } }),
      ctx("templates", "7", "image"),
    );

    const { url, init } = lastCall();
    expect(url).toBe(`${BACKEND}/api/templates/7/image`);
    expect(init.method).toBe("POST");
    expect(new Uint8Array(init.body as ArrayBuffer)).toEqual(bytes);
  });

  it("giữ content-type và x-actor-*, bỏ host/content-length/accept-encoding", async () => {
    const { PATCH } = await loadRoute();
    await PATCH(
      req("/api/customers/1", {
        method: "PATCH",
        body: JSON.stringify({ name: "A" }),
        headers: {
          "content-type": "application/json",
          "x-actor-id": "12",
          "x-actor-name": encodeURIComponent("Nguyễn Văn A"),
          host: "fe.test",
          "content-length": "999",
          "accept-encoding": "gzip, br",
          origin: "http://fe.test",
          referer: "http://fe.test/khach-hang",
        },
      }),
      ctx("customers", "1"),
    );

    const h = lastCall().init.headers;
    expect(h.get("content-type")).toBe("application/json");
    expect(h.get("x-actor-id")).toBe("12");
    expect(decodeURIComponent(h.get("x-actor-name") ?? "")).toBe("Nguyễn Văn A");
    expect(h.has("host")).toBe(false);
    expect(h.has("content-length")).toBe(false);
    expect(h.has("accept-encoding")).toBe(false);
    expect(h.has("origin")).toBe(false);
    expect(h.has("referer")).toBe(false);
  });

  it("fetch dùng redirect manual và no-store", async () => {
    const { GET } = await loadRoute();
    await GET(req("/api/x"), ctx("x"));
    const { init } = lastCall();
    expect(init.redirect).toBe("manual");
    expect(init.cache).toBe("no-store");
  });

  it("trả nguyên 3xx kèm location, không tự đi theo", async () => {
    fetchMock.mockResolvedValue(
      new Response(null, { status: 302, headers: { location: "https://storage.test/img.png" } }),
    );
    const { GET } = await loadRoute();
    const res = await GET(req("/api/templates/7/image"), ctx("templates", "7", "image"));

    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://storage.test/img.png");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("trả status, body và header của backend (trừ content-length/encoding)", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ error: "Không tìm thấy" }), {
        status: 404,
        headers: { "content-type": "application/json", "content-length": "5", "content-encoding": "gzip" },
      }),
    );
    const { GET } = await loadRoute();
    const res = await GET(req("/api/quotations/9"), ctx("quotations", "9"));

    expect(res.status).toBe(404);
    expect(res.headers.get("content-type")).toBe("application/json");
    expect(res.headers.has("content-encoding")).toBe(false);
    await expect(res.json()).resolves.toEqual({ error: "Không tìm thấy" });
  });

  it("204 không gắn body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    const { DELETE } = await loadRoute();
    const res = await DELETE(req("/api/customers/1", { method: "DELETE" }), ctx("customers", "1"));
    expect(res.status).toBe(204);
    expect(res.body).toBeNull();
  });

  it("chuyển tiếp nhiều set-cookie", async () => {
    const upstreamHeaders = new Headers();
    upstreamHeaders.append("set-cookie", "a=1; Path=/");
    upstreamHeaders.append("set-cookie", "b=2; Path=/");
    fetchMock.mockResolvedValue(new Response("{}", { status: 200, headers: upstreamHeaders }));
    const { GET } = await loadRoute();
    const res = await GET(req("/api/x"), ctx("x"));
    expect(res.headers.getSetCookie()).toEqual(["a=1; Path=/", "b=2; Path=/"]);
  });

  it("fetch lỗi mạng thì trả 502 JSON { error }", async () => {
    fetchMock.mockRejectedValue(new TypeError("fetch failed"));
    const { GET } = await loadRoute();
    const res = await GET(req("/api/dashboard"), ctx("dashboard"));

    expect(res.status).toBe(502);
    const body = await res.json();
    expect(typeof body.error).toBe("string");
    expect(body.error.length).toBeGreaterThan(0);
  });

  it("export đủ các method HTTP", async () => {
    const route = await loadRoute();
    for (const m of ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"] as const) {
      expect(typeof route[m]).toBe("function");
    }
  });
});

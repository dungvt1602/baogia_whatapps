import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiUrl, getJSON, patchJSON, postJSON, putJSON, sendJSON } from "@/lib/api";

// Trả về Response giả; fetch luôn được mock, test không chạm mạng thật.
function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("apiUrl", () => {
  it("không có NEXT_PUBLIC_API_URL thì giữ nguyên đường dẫn tương đối", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    expect(apiUrl("/api/customers")).toBe("/api/customers");
  });

  it("có NEXT_PUBLIC_API_URL thì ghép vào đầu", () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://be.example.com");
    expect(apiUrl("/api/customers")).toBe("https://be.example.com/api/customers");
  });
});

describe("getJSON", () => {
  it("trả dữ liệu JSON khi thành công và gọi đúng URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ id: "1", name: "A" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getJSON<{ id: string }>("/api/customers/1")).resolves.toEqual({ id: "1", name: "A" });
    expect(fetchMock).toHaveBeenCalledWith("/api/customers/1");
  });

  it("ném Error với message lấy từ body { error }", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Không tìm thấy" }, 404)));
    await expect(getJSON("/api/x")).rejects.toThrow("Không tìm thấy");
  });

  it("body lỗi không có { error } thì dùng 'Lỗi <status>'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ foo: 1 }, 500)));
    await expect(getJSON("/api/x")).rejects.toThrow("Lỗi 500");
  });

  it("body lỗi không phải JSON (HTML 502) thành ApiError 'Lỗi 502' kèm status, không phải lỗi parse", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Bad gateway</html>", { status: 502 })));
    const err = (await getJSON("/api/x").catch((e) => e)) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.message).toBe("Lỗi 502");
    expect(err.status).toBe(502);
  });

  it("body rỗng với status lỗi cũng ra 'Lỗi <status>'", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 504 })));
    await expect(getJSON("/api/x")).rejects.toThrow("Lỗi 504");
  });

  it("lỗi zod: nối ô lỗi đầu tiên và giữ body/issues", async () => {
    const issues = [{ path: ["items", 0, "unitPrice"], message: "Phải lớn hơn 0" }];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Dữ liệu không hợp lệ", issues }, 400)));
    const err = (await sendJSON("POST", "/api/x", {}).catch((e) => e)) as ApiError;
    expect(err.message).toBe("Dữ liệu không hợp lệ: items.0.unitPrice — Phải lớn hơn 0");
    expect(err.body.issues).toEqual(issues);
  });
});

describe("sendJSON", () => {
  it("gửi method, header content-type và body JSON", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(sendJSON("POST", "/api/quotations", { code: "BG1" })).resolves.toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/quotations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "BG1" }),
    });
  });

  it("không có body thì không gửi body", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);

    await sendJSON("DELETE", "/api/quotations/1");
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it("ném message từ { error } khi server trả lỗi", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Dữ liệu không hợp lệ" }, 400)));
    await expect(sendJSON("PATCH", "/api/x", {})).rejects.toThrow("Dữ liệu không hợp lệ");
  });

  it("dùng 'Lỗi <status>' khi lỗi không kèm message", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 403)));
    await expect(sendJSON("PUT", "/api/x", {})).rejects.toThrow("Lỗi 403");
  });

  it("các shortcut post/put/patch dùng đúng method", async () => {
    const fetchMock = vi.fn().mockImplementation(async () => jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await postJSON("/api/a", {});
    await putJSON("/api/b", {});
    await patchJSON("/api/c", {});
    expect(fetchMock.mock.calls.map((c) => c[1].method)).toEqual(["POST", "PUT", "PATCH"]);
  });
});

describe("ApiError", () => {
  it("giữ HTTP status để màn hình phân biệt 404 / 429, vẫn là Error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Link không hợp lệ" }, 404)));
    const err = await getJSON("/api/x").catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(404);
    expect((err as ApiError).message).toBe("Link không hợp lệ");
  });

  it("sendJSON cũng ném ApiError kèm status", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Quá nhanh" }, 429)));
    const err = await sendJSON("POST", "/api/x", {}).catch((e) => e);
    expect((err as ApiError).status).toBe(429);
  });
});

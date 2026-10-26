// Helper gọi API dùng chung cho các màn thật (Quản lý, Gửi báo giá).

// Base URL backend; rỗng = same-origin qua proxy /api.
export const apiUrl = (path: string) => (process.env.NEXT_PUBLIC_API_URL || "") + path;

// Lỗi từ backend, giữ thêm HTTP status để màn hình phân biệt 404 / 429 / lỗi khác (trang công khai NCC).
// Vẫn là Error nên mọi chỗ cũ `catch (e) { (e as Error).message }` chạy như trước.
// `body` là JSON phản hồi (nếu có) để màn hình đọc thêm trường như `zalo`, `buttonError`, `issues`.
export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;
  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// Body lỗi không phải JSON (HTML 502/504 của proxy, body rỗng) KHÔNG được thành lỗi parse mơ hồ:
// coi như {} để ra "Lỗi <status>" và vẫn giữ status.
async function readBody(res: Response): Promise<Record<string, unknown>> {
  const data = await res.json().catch(() => ({}));
  return data && typeof data === "object" ? (data as Record<string, unknown>) : {};
}

// Lỗi zod của BE ({error:"Dữ liệu không hợp lệ", issues:[{path,message}]}) -> kèm ô lỗi đầu tiên cho dễ hiểu.
function errorMessage(data: Record<string, unknown>, status: number): string {
  const base = typeof data.error === "string" && data.error ? data.error : `Lỗi ${status}`;
  const issues = data.issues;
  if (base === "Dữ liệu không hợp lệ" && Array.isArray(issues) && issues[0] && typeof issues[0] === "object") {
    const first = issues[0] as { path?: unknown; message?: unknown };
    const path = Array.isArray(first.path) ? first.path.join(".") : "";
    const msg = typeof first.message === "string" ? first.message : "";
    if (msg) return `${base}: ${path ? path + " — " : ""}${msg}`;
  }
  return base;
}

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(apiUrl(url));
  const data = await readBody(res);
  if (!res.ok) throw new ApiError(errorMessage(data, res.status), res.status, data);
  return data as T;
}

export async function sendJSON<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: { "content-type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await readBody(res);
  if (!res.ok) throw new ApiError(errorMessage(data, res.status), res.status, data);
  return data as T;
}

export const postJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("POST", url, body);
export const putJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("PUT", url, body);
export const patchJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("PATCH", url, body);

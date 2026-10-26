// Helper gọi API dùng chung cho các màn thật (Quản lý, Gửi báo giá).

// Base URL backend; rỗng = same-origin qua proxy /api.
export const apiUrl = (path: string) => (process.env.NEXT_PUBLIC_API_URL || "") + path;

export async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(apiUrl(url));
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}

export async function sendJSON<T>(method: "POST" | "PUT" | "PATCH" | "DELETE", url: string, body?: unknown): Promise<T> {
  const res = await fetch(apiUrl(url), {
    method,
    headers: { "content-type": "application/json" },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}`);
  return data as T;
}

export const postJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("POST", url, body);
export const putJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("PUT", url, body);
export const patchJSON = <T,>(url: string, body?: unknown) => sendJSON<T>("PATCH", url, body);

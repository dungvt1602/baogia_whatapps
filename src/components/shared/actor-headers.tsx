"use client";

import { useEffect } from "react";

// Gắn DANH TÍNH NGƯỜI THAO TÁC vào mọi request /api/* của trình duyệt (header x-actor-id / x-actor-name)
// để server ghi nhật ký "ai đã làm gì". Bọc window.fetch một lần nên mọi màn (kể cả chỗ gọi fetch thô)
// đều được — không phải sửa từng nơi. Đọc session từ localStorage tại thời điểm gọi (đổi user là đổi ngay).
// Tên có dấu -> encodeURIComponent vì header chỉ nhận ASCII; server decode lại.
const KEY = "ago_session";

export default function ActorHeaders() {
  useEffect(() => {
    const w = window as unknown as { __agoActorFetch?: boolean };
    if (w.__agoActorFetch) return;
    w.__agoActorFetch = true;
    const orig = window.fetch.bind(window);
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      try {
        const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
        const isApi = url.startsWith("/api/") || url.startsWith(location.origin + "/api/");
        if (isApi) {
          const raw = localStorage.getItem(KEY);
          if (raw) {
            const s = JSON.parse(raw) as { id?: string | number; userName?: string; username?: string };
            const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined));
            if (s.id != null && String(s.id)) headers.set("x-actor-id", String(s.id));
            const name = s.userName || s.username || "";
            if (name) headers.set("x-actor-name", encodeURIComponent(name));
            return orig(input, { ...init, headers });
          }
        }
      } catch {
        // localStorage bị chặn / JSON hỏng -> gửi như thường
      }
      return orig(input, init);
    };
  }, []);
  return null;
}

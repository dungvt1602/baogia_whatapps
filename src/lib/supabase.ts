"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Client Supabase phía TRÌNH DUYỆT — CHỈ dùng cho Realtime (nghe INSERT trên inbound_messages).
// Dùng anon key (public, an toàn để lộ ở client). KHÔNG dùng cho ghi/đọc nghiệp vụ — đó là việc
// của Prisma phía server. Trả null nếu chưa cấu hình env -> app vẫn chạy, chỉ mất realtime.
let cached: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (cached !== undefined) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  cached = url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: false }, // tool nội bộ, không dùng Supabase Auth
        realtime: { params: { eventsPerSecond: 5 } },
      })
    : null;
  return cached;
}

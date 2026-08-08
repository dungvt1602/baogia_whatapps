"use client";

import { useAgo } from "./useAgo";
import Auth from "./Auth";
import Shell from "./Shell";

// Ứng dụng quản lý báo giá nội bộ Ago Group (port từ thiết kế dc).
export default function AgoApp() {
  const v = useAgo();
  return v.isApp ? <Shell v={v} /> : <Auth v={v} />;
}

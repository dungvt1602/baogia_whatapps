"use client";

import { createContext, useContext } from "react";
import { useAgo, type Ctx } from "@/components/layout/useAgo";

const AgoCtx = createContext<Ctx | null>(null);

// Chạy useAgo() 1 lần ở layout, cung cấp cho toàn bộ màn con qua context.
export function AgoProvider({ children }: { children: React.ReactNode }) {
  const v = useAgo();
  return <AgoCtx.Provider value={v}>{children}</AgoCtx.Provider>;
}

export function useAgoCtx(): Ctx {
  const v = useContext(AgoCtx);
  if (!v) throw new Error("useAgoCtx phải nằm trong AgoProvider");
  return v;
}

"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Logs } from "@/features/mock/Screens2";

export default function Page() {
  return <Logs v={useAgoCtx()} />;
}

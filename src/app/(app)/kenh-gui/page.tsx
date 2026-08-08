"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Channels } from "@/features/mock/Screens2";

export default function Page() {
  return <Channels v={useAgoCtx()} />;
}

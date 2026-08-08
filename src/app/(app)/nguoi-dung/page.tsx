"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Team } from "@/features/mock/Screens2";

export default function Page() {
  return <Team v={useAgoCtx()} />;
}

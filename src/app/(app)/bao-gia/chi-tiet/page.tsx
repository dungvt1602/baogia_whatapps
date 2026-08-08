"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Detail } from "@/features/mock/Screens";

export default function Page() {
  return <Detail v={useAgoCtx()} />;
}

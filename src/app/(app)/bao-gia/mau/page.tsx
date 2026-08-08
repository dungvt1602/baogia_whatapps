"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Template } from "@/features/mock/Screens";

export default function Page() {
  return <Template v={useAgoCtx()} />;
}

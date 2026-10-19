"use client";
import { useAgoCtx } from "@/components/layout/ago-context";
import { Template } from "@/features/mock/components/screens";

export default function Page() {
  return <Template v={useAgoCtx()} />;
}

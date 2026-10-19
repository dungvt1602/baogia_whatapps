"use client";
import { useAgoCtx } from "@/components/layout/ago-context";
import { Detail } from "@/features/mock/components/screens";

export default function Page() {
  return <Detail v={useAgoCtx()} />;
}

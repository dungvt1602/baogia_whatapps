"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { NewQuote } from "@/features/mock/Screens";

export default function Page() {
  return <NewQuote v={useAgoCtx()} />;
}

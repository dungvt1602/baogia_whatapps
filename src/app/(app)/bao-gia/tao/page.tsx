"use client";
import { useAgoCtx } from "@/components/layout/ago-context";
import { NewQuote } from "@/features/mock/components/screens";

export default function Page() {
  return <NewQuote v={useAgoCtx()} />;
}

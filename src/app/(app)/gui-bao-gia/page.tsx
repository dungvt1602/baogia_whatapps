"use client";
import { useAgoCtx } from "@/components/layout/ago-context";
import SendFlow from "@/features/send/components/send-flow";

export default function Page() {
  return <SendFlow actorName={useAgoCtx().userName} />;
}

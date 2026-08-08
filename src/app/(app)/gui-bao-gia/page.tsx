"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import SendFlow from "@/features/send/SendFlow";

export default function Page() {
  return <SendFlow actorName={useAgoCtx().userName} />;
}

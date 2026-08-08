"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Dash } from "@/features/mock/Screens";

export default function Page() {
  return <Dash v={useAgoCtx()} />;
}

"use client";
import { useAgoCtx } from "@/components/layout/AgoContext";
import { Customers } from "@/features/mock/Screens2";

export default function Page() {
  return <Customers v={useAgoCtx()} />;
}

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { AgoProvider } from "@/components/layout/AgoContext";
import AppChrome from "@/components/layout/AppChrome";

// Layout dùng chung cho mọi màn trong app: chặn khi chưa đăng nhập, bọc chrome.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !session) router.replace("/login");
  }, [ready, session, router]);

  if (!ready || !session) return null; // đang đọc session / chuyển hướng
  return (
    <AgoProvider>
      <AppChrome>{children}</AppChrome>
    </AgoProvider>
  );
}

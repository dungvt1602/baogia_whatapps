"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Session = {
  id?: string;
  username?: string;
  email?: string;
  userName: string;
  userInitials: string;
  role: "admin" | "staff";
} | null;

const KEY = "ago_session";

type LoginResult = { ok: boolean; error?: string };

type AuthCtx = {
  session: Session;
  ready: boolean;
  login: (identifier: string, password?: string) => Promise<LoginResult>;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({
  session: null,
  ready: false,
  login: async () => ({ ok: false }),
  logout: () => {},
});

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const picked = parts.length > 1 ? parts[parts.length - 2][0] + parts[parts.length - 1][0] : name.slice(0, 2);
  return picked.toUpperCase();
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSession(JSON.parse(raw));
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const login: AuthCtx["login"] = async (identifier, password) => {
    const id = (identifier || "").trim();
    if (!id) return { ok: false, error: "Vui lòng nhập tài khoản." };
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier: id, password: password ?? "" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, error: data?.error || `Đăng nhập lỗi (${res.status})` };
      const name: string = data.fullName || data.username || id;
      const s: Session = {
        id: data.id,
        username: data.username,
        email: data.email,
        userName: name,
        userInitials: initials(name),
        role: data.isAdmin ? "admin" : "staff",
      };
      localStorage.setItem(KEY, JSON.stringify(s));
      setSession(s);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setSession(null);
  };

  return <Ctx.Provider value={{ session, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

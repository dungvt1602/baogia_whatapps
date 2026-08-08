"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Session = { userName: string; userInitials: string; role: "admin" | "staff" } | null;

const KEY = "ago_session";

type AuthCtx = {
  session: Session;
  ready: boolean;
  login: (email: string, password: string, regName?: string) => boolean;
  logout: () => void;
};

const Ctx = createContext<AuthCtx>({ session: null, ready: false, login: () => false, logout: () => {} });

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

  const login: AuthCtx["login"] = (email, password, regName) => {
    if (!email || !password) return false;
    const local = email.toLowerCase().split("@")[0];
    const isAdm = local.includes("admin") || local.includes("giam.doc");
    const name = regName || (isAdm ? "Trần Quốc Bảo" : "Lê Ngọc Anh");
    const s: Session = { userName: name, userInitials: initials(name), role: isAdm ? "admin" : "staff" };
    localStorage.setItem(KEY, JSON.stringify(s));
    setSession(s);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(KEY);
    setSession(null);
  };

  return <Ctx.Provider value={{ session, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

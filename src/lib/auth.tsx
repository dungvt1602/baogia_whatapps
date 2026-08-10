"use client";

import { createContext, useContext, useSyncExternalStore } from "react";

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

// ---- Store ngoài (localStorage) đọc qua useSyncExternalStore ----
// Không setState trong effect (rule react-hooks/set-state-in-effect) và an toàn SSR:
// server + lần hydrate đầu dùng snapshot mặc định, sau đó mới đọc localStorage thật.
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedSession: Session = null;
let cacheReady = false;

function getSessionSnapshot(): Session {
  // getSnapshot phải trả reference ỔN ĐỊNH khi dữ liệu không đổi -> memo theo chuỗi raw
  // (nếu parse mới mỗi lần sẽ gây vòng lặp render vô hạn).
  const raw = localStorage.getItem(KEY);
  if (!cacheReady || raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedSession = raw ? (JSON.parse(raw) as Session) : null;
    } catch {
      cachedSession = null;
    }
    cacheReady = true;
  }
  return cachedSession;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  // Đồng bộ khi tab khác đăng nhập/đăng xuất.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) emit();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function emit() {
  for (const fn of listeners) fn();
}

function writeSession(s: Session) {
  if (s) localStorage.setItem(KEY, JSON.stringify(s));
  else localStorage.removeItem(KEY);
  emit(); // báo cho tab hiện tại (storage event chỉ bắn sang tab khác)
}

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
  // SSR + hydrate đầu: session=null, ready=false (khớp server, tránh mismatch).
  // Sau hydrate: đọc localStorage thật, ready=true.
  const session = useSyncExternalStore(subscribe, getSessionSnapshot, () => null);
  const ready = useSyncExternalStore(subscribe, () => true, () => false);

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
      writeSession(s);
      return { ok: true };
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
  };

  const logout = () => {
    writeSession(null);
  };

  return <Ctx.Provider value={{ session, ready, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);

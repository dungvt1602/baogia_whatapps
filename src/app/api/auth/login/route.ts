import { json } from "@/server/http/json";
import { findUserForLogin } from "@/server/services/userService";
import { verifyPassword, isRealHash } from "@/server/lib/password";

// Đăng nhập: tra user (username/email) + isActive + XÁC THỰC mật khẩu (bcrypt).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const identifier = String(body?.identifier || "").trim();
  const password = String(body?.password || "");
  if (!identifier) return json({ error: "Vui lòng nhập tài khoản." }, { status: 400 });
  if (!password) return json({ error: "Vui lòng nhập mật khẩu." }, { status: 400 });

  const u = await findUserForLogin(identifier);
  if (!u) return json({ error: "Tài khoản không tồn tại hoặc đã bị khóa." }, { status: 401 });

  if (!isRealHash(u.passwordHash)) {
    return json({ error: "Tài khoản chưa được đặt mật khẩu. Nhờ admin đặt trong màn Người dùng." }, { status: 401 });
  }
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return json({ error: "Mật khẩu không đúng." }, { status: 401 });

  const isAdmin = u.userRoles.some((r) => r.role.code === "ADMIN");
  return json({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    isAdmin,
    roleLabel: isAdmin ? "Quản trị viên" : "Nhân viên kinh doanh",
  });
}

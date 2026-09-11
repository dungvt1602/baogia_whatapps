import { json } from "@/server/http/json";
import { findUserForLogin } from "@/server/services/userService";
import { verifyPassword, isRealHash } from "@/server/lib/password";
import { audit } from "@/server/services/auditService";

// Đăng nhập: tra user (username/email) + isActive + XÁC THỰC mật khẩu (bcrypt).
// Ghi nhật ký cả thành công lẫn thất bại (không bao giờ ghi mật khẩu).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const identifier = String(body?.identifier || "").trim();
  const password = String(body?.password || "");
  if (!identifier) return json({ error: "Vui lòng nhập tài khoản." }, { status: 400 });
  if (!password) return json({ error: "Vui lòng nhập mật khẩu." }, { status: 400 });

  const fail = async (reason: string, status = 401) => {
    await audit(req, { action: "DANG_NHAP_LOI", target: identifier, note: reason, result: "FAILED", actor: { id: null, name: identifier } });
    return json({ error: reason }, { status });
  };

  const u = await findUserForLogin(identifier);
  if (!u) return fail("Tài khoản không tồn tại hoặc đã bị khóa.");

  if (!isRealHash(u.passwordHash)) {
    return fail("Tài khoản chưa được đặt mật khẩu. Nhờ admin đặt trong màn Người dùng.");
  }
  const ok = await verifyPassword(password, u.passwordHash);
  if (!ok) return fail("Mật khẩu không đúng.");

  const isAdmin = u.userRoles.some((r) => r.role.code === "ADMIN");
  const name = u.fullName || u.username;
  await audit(req, { action: "DANG_NHAP", target: u.username, note: isAdmin ? "quản trị viên" : "nhân viên", actor: { id: String(u.id), name } });
  return json({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
    isAdmin,
    roleLabel: isAdmin ? "Quản trị viên" : "Nhân viên kinh doanh",
  });
}

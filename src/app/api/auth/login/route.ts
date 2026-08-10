import { json } from "@/server/http/json";
import { findUserForLogin } from "@/server/services/userService";

// Đăng nhập đơn giản (theo lựa chọn): tra user tồn tại + đang hoạt động,
// trả tên & vai trò THẬT từ DB. Chưa xác thực mật khẩu chặt.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const identifier = String(body?.identifier || "").trim();
  if (!identifier) return json({ error: "Vui lòng nhập tài khoản." }, { status: 400 });

  const u = await findUserForLogin(identifier);
  if (!u) return json({ error: "Tài khoản không tồn tại hoặc đã bị khóa." }, { status: 401 });

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

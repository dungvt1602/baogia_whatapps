import { handle } from "@/server/http/json";
import { listUsers, createUser } from "@/server/services/userService";
import { createUserSchema } from "@/server/validation/user.schema";
import { audit, labelOf } from "@/server/services/auditService";

export async function GET() {
  return handle(() => listUsers(), 500);
}

export async function POST(req: Request) {
  return handle(async () => {
    const input = createUserSchema.parse(await req.json());
    const u = await createUser(input);
    // Tự đăng ký (chưa đăng nhập) thì actor trống -> ghi chính người vừa tạo.
    await audit(req, {
      action: "NGUOI_DUNG_TAO",
      target: labelOf("user", u as unknown as Record<string, unknown>),
      note: `email ${input.email}${input.password ? "" : " (chưa đặt mật khẩu)"}`,
    });
    return u;
  });
}

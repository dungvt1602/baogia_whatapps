import { prisma } from "@/lib/prisma";
import { jsonBig } from "@/lib/json";

// GET /api/users -> lấy danh sách user kèm roles
export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      userRoles: { include: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return jsonBig(users);
}

// POST /api/users -> tạo user mới
// body: { username, email, passwordHash, fullName? }
export async function POST(request: Request) {
  const body = await request.json();
  const user = await prisma.user.create({
    data: {
      username: body.username,
      email: body.email,
      passwordHash: body.passwordHash,
      fullName: body.fullName ?? null,
    },
  });
  return jsonBig(user, { status: 201 });
}

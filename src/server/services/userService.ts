import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateUserInput, UpdateUserInput } from "@/server/validation/user.schema";

export function listUsers() {
  return prisma.user.findMany({
    include: { userRoles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

// Đăng nhập đơn giản: tra theo username HOẶC email, phải đang hoạt động.
export function findUserForLogin(identifier: string) {
  const id = identifier.trim();
  return prisma.user.findFirst({
    where: {
      isActive: true,
      OR: [
        { username: { equals: id, mode: "insensitive" } },
        { email: { equals: id, mode: "insensitive" } },
      ],
    },
    include: { userRoles: { include: { role: true } } },
  });
}

export function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash ?? "SET_BY_ADMIN",
      fullName: input.fullName ?? null,
      ...(input.isActive != null ? { isActive: input.isActive } : {}),
    },
  });
}

export function updateUser(id: string, input: UpdateUserInput) {
  const data: Record<string, unknown> = {};
  if (input.username !== undefined) data.username = input.username;
  if (input.email !== undefined) data.email = input.email;
  if (input.fullName !== undefined) data.fullName = input.fullName;
  if (input.isActive !== undefined) data.isActive = input.isActive;
  return prisma.user.update({ where: { id: BigInt(id) }, data });
}

// Xóa người dùng: gỡ vai trò + gán báo giá trước, rồi xóa.
export async function deleteUser(id: string) {
  const uid = BigInt(id);
  await prisma.$transaction([
    prisma.userRole.deleteMany({ where: { userId: uid } }),
    prisma.userQuotation.deleteMany({ where: { userId: uid } }),
    prisma.user.delete({ where: { id: uid } }),
  ]);
  return { ok: true };
}

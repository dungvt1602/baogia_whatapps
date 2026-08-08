import "server-only";
import { prisma } from "@/server/db/prisma";
import type { CreateUserInput } from "@/server/validation/user.schema";

export function listUsers() {
  return prisma.user.findMany({
    include: { userRoles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export function createUser(input: CreateUserInput) {
  return prisma.user.create({
    data: {
      username: input.username,
      email: input.email,
      passwordHash: input.passwordHash,
      fullName: input.fullName ?? null,
    },
  });
}

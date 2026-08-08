import "server-only";
import type { Channel } from "@prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CreateChannelInput } from "@/server/validation/channel.schema";

export function listChannels() {
  return prisma.channel.findMany({ orderBy: { createdAt: "desc" } });
}

export function createChannel(input: CreateChannelInput) {
  return prisma.channel.create({
    data: {
      name: input.name,
      type: input.type,
      accountId: input.accountId,
      apiKeyEnv: input.apiKeyEnv,
      note: input.note ?? null,
    },
  });
}

// Lấy API key THẬT của một kênh từ biến môi trường.
// DB chỉ lưu channel.apiKeyEnv (tên biến), key thật đọc từ process.env ở đây.
export function getChannelApiKey(channel: Pick<Channel, "apiKeyEnv" | "name">): string {
  const key = process.env[channel.apiKeyEnv];
  if (!key) {
    throw new Error(
      `Thiếu API key cho kênh "${channel.name}": chưa đặt biến môi trường ${channel.apiKeyEnv} trong .env`,
    );
  }
  return key;
}

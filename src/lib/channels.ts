import "server-only";
import type { Channel } from "@prisma/client";

// Lấy API key THẬT của một kênh từ biến môi trường.
// DB chỉ lưu channel.apiKeyEnv (tên biến), key thật đọc từ process.env ở đây.
// "server-only" đảm bảo file này không bao giờ bị bundle ra phía client.
export function getChannelApiKey(channel: Pick<Channel, "apiKeyEnv" | "name">): string {
  const key = process.env[channel.apiKeyEnv];
  if (!key) {
    throw new Error(
      `Thiếu API key cho kênh "${channel.name}": chưa đặt biến môi trường ${channel.apiKeyEnv} trong .env`,
    );
  }
  return key;
}

import type { ReactNode } from "react";

/*
 * Badge nhỏ dùng chung (trạng thái RFQ, lời mời, cảnh báo thiếu Zalo...).
 * `tone` chọn bộ màu; không dùng màu tuỳ ý để các màn trông đồng nhất.
 */
export type BadgeTone = "green" | "blue" | "amber" | "red" | "gray" | "purple";

const TONES: Record<BadgeTone, string> = {
  green: "bg-[#E7F5EC] text-[#1F7440]",
  blue: "bg-[#E8F0FE] text-[#1A56C4]",
  amber: "bg-[#FFF4E0] text-[#A15C00]",
  red: "bg-[#FDECEC] text-[#B3261E]",
  gray: "bg-[#F1F4F1] text-[#6B7A70]",
  purple: "bg-[#F1EAFB] text-[#6B3FA0]",
};

export function Badge({ tone, children, title }: { tone: BadgeTone; children: ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center whitespace-nowrap rounded-[5px] px-2 py-0.5 text-[11px] font-bold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

/*
 * BE tự tra SĐT -> Zalo user_id khi gửi, nên NCC gửi được khi có Zalo user_id HOẶC SĐT
 * (người đó vẫn phải đã quan tâm OA — Zalo bắt buộc, BE báo lỗi dễ hiểu nếu chưa).
 */
export type ZaloReach = "id" | "phone" | "none";
export function zaloReach(s: { phone?: string | null; zaloUserId?: string | null }): ZaloReach {
  if (s.zaloUserId?.trim()) return "id";
  if (s.phone?.trim()) return "phone";
  return "none";
}

export function ZaloReachBadge({ reach }: { reach: ZaloReach }) {
  if (reach === "none")
    return (
      <Badge tone="amber" title="Chưa có SĐT hoặc Zalo user_id — không gửi được RFQ qua Zalo">
        Chưa có SĐT/Zalo
      </Badge>
    );
  if (reach === "phone")
    return (
      <Badge tone="gray" title="Chưa có Zalo user_id: hệ thống sẽ tra theo SĐT khi gửi (người đó phải đã quan tâm OA)">
        Gửi bằng SĐT
      </Badge>
    );
  return null;
}

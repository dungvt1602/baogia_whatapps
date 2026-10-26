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

// NCC chưa có Zalo user_id thì không gửi được RFQ qua Zalo.
export function MissingZaloBadge() {
  return (
    <Badge tone="amber" title="Chưa có Zalo user_id — không gửi được RFQ qua Zalo">
      Thiếu Zalo
    </Badge>
  );
}

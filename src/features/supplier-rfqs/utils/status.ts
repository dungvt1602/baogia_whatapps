import type { BadgeTone } from "@/components/shared/badge";
import type { InvitationStatus, RfqStatus } from "@/features/supplier-rfqs/types";

// Nhãn + màu badge cho trạng thái RFQ và lời mời. Trạng thái lạ thì hiện nguyên mã.
export const RFQ_STATUS_META: Record<RfqStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Nháp", tone: "gray" },
  SENT: { label: "Đã gửi", tone: "blue" },
  CLOSED: { label: "Đã đóng", tone: "red" },
};

export const INVITATION_STATUS_META: Record<InvitationStatus, { label: string; tone: BadgeTone }> = {
  PENDING: { label: "Chờ gửi", tone: "gray" },
  SENT: { label: "Đã gửi", tone: "blue" },
  VIEWED: { label: "Đã xem", tone: "purple" },
  SUBMITTED: { label: "Đã nộp giá", tone: "green" },
  EXPIRED: { label: "Hết hạn", tone: "amber" },
  FAILED: { label: "Gửi lỗi", tone: "red" },
};

export function rfqStatusMeta(s: string): { label: string; tone: BadgeTone } {
  return RFQ_STATUS_META[s as RfqStatus] ?? { label: s, tone: "gray" };
}
export function invitationStatusMeta(s: string): { label: string; tone: BadgeTone } {
  return INVITATION_STATUS_META[s as InvitationStatus] ?? { label: s, tone: "gray" };
}

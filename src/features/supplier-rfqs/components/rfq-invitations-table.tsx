import { Badge } from "@/components/shared/badge";
import { formatDateTime } from "@/features/supplier-rfqs/utils/format";
import { invitationStatusMeta } from "@/features/supplier-rfqs/utils/status";
import type { RfqInvitation } from "@/features/supplier-rfqs/types";

const TH = "whitespace-nowrap border border-[#D3DCE3] bg-[#EEF2F5] px-2 py-1.5 text-left text-[11px] font-bold text-[#33475B]";
const TD = "border border-[#E4EAEF] px-2 py-1.5 text-[12.5px] text-[#1B2A20]";

// Bảng lời mời đã gửi: trạng thái, các mốc thời gian, lỗi (nguyên văn từ Zalo/BE).
export default function RfqInvitationsTable({ invitations }: { invitations: RfqInvitation[] }) {
  return (
    <div className="overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
      <table className="w-full min-w-[720px] border-collapse">
        <thead>
          <tr>
            <th className={TH}>Nhà cung cấp</th>
            <th className={TH}>Trạng thái</th>
            <th className={TH}>Gửi lúc</th>
            <th className={TH}>Xem lúc</th>
            <th className={TH}>Nộp giá lúc</th>
            <th className={TH}>Lỗi</th>
          </tr>
        </thead>
        <tbody>
          {invitations.length === 0 && (
            <tr>
              <td colSpan={6} className={`${TD} p-4 text-center text-[#8B9A90]`}>
                Chưa gửi cho nhà cung cấp nào.
              </td>
            </tr>
          )}
          {invitations.map((inv) => {
            const m = invitationStatusMeta(inv.status);
            return (
              <tr key={inv.id}>
                <td className={`${TD} font-semibold`}>
                  {inv.supplierName}{" "}
                  {inv.isTest && (
                    <Badge tone="amber" title="Lời mời gửi thử (Nhắn thử)">
                      Thử
                    </Badge>
                  )}
                </td>
                <td className={TD}>
                  <Badge tone={m.tone}>{m.label}</Badge>
                </td>
                <td className={`${TD} whitespace-nowrap`}>{formatDateTime(inv.sentAt)}</td>
                <td className={`${TD} whitespace-nowrap`}>{formatDateTime(inv.viewedAt)}</td>
                <td className={`${TD} whitespace-nowrap`}>{formatDateTime(inv.submittedAt)}</td>
                <td className={`${TD} max-w-[320px] break-words text-[#B3261E]`}>{inv.error || ""}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Badge } from "@/components/shared/badge";
import { BTN_GHOST } from "@/components/shared/modal";
import { buildMatrix, isMixedCurrency, submittedSupplierCount } from "@/features/supplier-rfqs/utils/compare";
import { formatDateTime, formatDecimal, formatMoney } from "@/features/supplier-rfqs/utils/format";
import { invitationStatusMeta } from "@/features/supplier-rfqs/utils/status";
import type { CompareData } from "@/features/supplier-rfqs/types";

/*
 * Tab "So sánh giá": ma trận mặt hàng × NCC. Ô giá thấp nhất (theo bestInvitationId của BE)
 * tô xanh. MOQ / thời gian giao / ghi chú hiện dòng nhỏ dưới giá (đầy đủ khi rê chuột).
 */
const TH = "border border-[#D3DCE3] bg-[#EEF2F5] px-2 py-1.5 text-left align-top text-[11.5px] font-bold text-[#33475B]";
const TD = "border border-[#E4EAEF] px-2 py-1.5 align-top text-[12.5px] text-[#1B2A20]";

export default function RfqComparePanel({ rfqId, refreshKey }: { rfqId: string; refreshKey: number }) {
  const [data, setData] = useState<CompareData | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getJSON<CompareData>(`/api/supplier-rfqs/${rfqId}/compare`));
      setErr("");
    } catch (e) {
      setErr(apiErrorMessage(e, "Không tải được bảng so sánh giá"));
    } finally {
      setLoading(false);
    }
  }, [rfqId]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load, refreshKey]);

  const matrix = useMemo(() => (data ? buildMatrix(data) : []), [data]);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="text-[13px] font-bold text-[#14261A]">So sánh giá nhà cung cấp</div>
        {data && (
          <div className="text-[12.5px] text-[#7B8A80]">
            {submittedSupplierCount(data)}/{data.suppliers.length} NCC đã nộp giá
          </div>
        )}
        <div className="flex-1" />
        <button type="button" className={BTN_GHOST} disabled={loading} onClick={() => void load()}>
          {loading ? "Đang tải..." : "Làm mới"}
        </button>
      </div>

      {err && <div className="mb-2 rounded-[10px] border border-[#F3C9C6] bg-[#FDECEC] px-3 py-2 text-[13px] text-[#B3261E]">{err}</div>}

      {!data && loading && <div className="rounded-[10px] border border-[#E4EAEF] bg-white p-6 text-center text-[13px] text-[#8B9A90]">Đang tải...</div>}

      {data && data.suppliers.length === 0 && (
        <div className="rounded-[10px] border border-dashed border-[#CBD6CD] bg-white p-6 text-center text-[13px] text-[#8B9A90]">Chưa gửi cho nhà cung cấp nào nên chưa có giá để so sánh.</div>
      )}

      {data && data.suppliers.length > 0 && (
        <>
          {submittedSupplierCount(data) === 0 && (
            <div className="mb-2 rounded-[10px] bg-[#FFF8EA] px-3 py-2 text-[12.5px] text-[#7A4A00]">Chưa có nhà cung cấp nào nộp giá.</div>
          )}
          {isMixedCurrency(data) && (
            <div className="mb-2 rounded-[10px] bg-[#FFF8EA] px-3 py-2 text-[12.5px] text-[#7A4A00]" data-testid="mixed-currency-note">
              Các NCC báo giá bằng tiền tệ khác nhau nên không tô giá thấp nhất — hãy quy đổi để so sánh.
            </div>
          )}
          <div className="overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
            <table className="w-full border-collapse" style={{ minWidth: 320 + data.suppliers.length * 170 }}>
              <thead>
                <tr>
                  <th className={`${TH} sticky left-0 z-[1] min-w-[200px]`}>Mặt hàng</th>
                  {data.suppliers.map((s) => {
                    const m = invitationStatusMeta(s.status);
                    return (
                      <th key={s.invitationId} className={`${TH} min-w-[160px]`} title={s.note || undefined}>
                        <div className="text-[13px] text-[#14261A]">{s.name}</div>
                        <div className="mt-0.5">
                          <Badge tone={m.tone}>{m.label}</Badge>
                        </div>
                        <div className="mt-1 text-[11px] font-normal text-[#6B7A70]">
                          {s.submittedAt ? `v${String(s.version ?? 1)} · ${formatDateTime(s.submittedAt)}` : "Chưa nộp giá"}
                        </div>
                        {s.note && <div className="mt-0.5 line-clamp-2 text-[11px] font-normal text-[#6B7A70]">“{s.note}”</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {matrix.length === 0 && (
                  <tr>
                    <td colSpan={data.suppliers.length + 1} className={`${TD} p-4 text-center text-[#8B9A90]`}>
                      RFQ chưa có mặt hàng.
                    </td>
                  </tr>
                )}
                {matrix.map((row) => (
                  <tr key={row.itemId}>
                    <td className={`${TD} sticky left-0 z-[1] bg-white`}>
                      <div className="font-semibold">
                        {String(row.no)}. {row.product}
                      </div>
                      <div className="text-[11.5px] text-[#7B8A80]">
                        SL: {row.quantity ? formatDecimal(row.quantity) : "—"}
                        {row.unit ? ` ${row.unit}` : ""}
                      </div>
                    </td>
                    {row.cells.map((c, i) => {
                      const sup = data.suppliers[i];
                      if (!c) {
                        return (
                          <td key={sup.invitationId} className={`${TD} text-center text-[#B5C0B8]`}>
                            —
                          </td>
                        );
                      }
                      const extra = [c.moq ? `MOQ ${formatDecimal(c.moq)}` : "", c.leadTimeDays != null && c.leadTimeDays !== "" ? `${String(c.leadTimeDays)} ngày` : ""].filter(Boolean).join(" · ");
                      const full = [extra, c.note].filter(Boolean).join(" — ");
                      return (
                        <td key={sup.invitationId} className={`${TD} ${c.isBest ? "bg-[#E3F4E8]" : ""}`} title={full || undefined} data-best={c.isBest ? "true" : undefined}>
                          <div className={`text-[13.5px] font-bold tabular-nums ${c.isBest ? "text-[#1F7440]" : ""}`}>
                            {formatMoney(c.unitPrice, sup.currency || data.rfq.currency)}
                            {c.isBest && <span className="ml-1.5 rounded bg-[#1F7440] px-1 py-px text-[10px] font-bold text-white">Thấp nhất</span>}
                          </div>
                          {extra && <div className="text-[11px] text-[#6B7A70]">{extra}</div>}
                          {c.note && <div className="line-clamp-2 text-[11px] text-[#6B7A70]">{c.note}</div>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-1.5 text-[11.5px] text-[#8B9A90]">Ô tô xanh là giá thấp nhất của từng mặt hàng (chỉ tính khi có từ 2 NCC báo giá). Giá hiển thị theo tiền tệ NCC đã chọn.</div>
        </>
      )}
    </div>
  );
}

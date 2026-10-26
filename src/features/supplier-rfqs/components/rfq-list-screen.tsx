"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { SkeletonRows } from "@/components/shared/ui";
import { Badge } from "@/components/shared/badge";
import { BTN_GREEN, FIELD_CLS } from "@/components/shared/modal";
import { PATHS } from "@/components/layout/routes";
import RfqCreateModal from "@/features/supplier-rfqs/components/rfq-create-modal";
import { formatDateTime } from "@/features/supplier-rfqs/utils/format";
import { rfqStatusMeta } from "@/features/supplier-rfqs/utils/status";
import type { RfqListRow } from "@/features/supplier-rfqs/types";

const TH = "sticky top-0 whitespace-nowrap border border-[#D3DCE3] bg-[#EEF2F5] px-2 py-1.5 text-left text-[11px] font-bold text-[#33475B]";
const TD = "border border-[#E4EAEF] px-2 py-2 text-[12.5px] text-[#1B2A20]";

export default function RfqListScreen() {
  const router = useRouter();
  const [rows, setRows] = useState<RfqListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [status, setStatus] = useState("");
  const [creating, setCreating] = useState(false);
  const reqId = useRef(0);

  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (debouncedQ) p.set("search", debouncedQ);
      if (status) p.set("status", status);
      const qs = p.toString();
      const data = await getJSON<RfqListRow[]>(`/api/supplier-rfqs${qs ? `?${qs}` : ""}`);
      if (my !== reqId.current) return;
      setRows(data);
      setErr("");
    } catch (e) {
      if (my === reqId.current) setErr(apiErrorMessage(e, "Không tải được danh sách yêu cầu báo giá"));
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [debouncedQ, status]);

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  const open = (id: string) => router.push(`${PATHS.rfqs}/${id}`);

  return (
    <div>
      {err && <div className="mb-3 rounded-[10px] border border-[#F3C9C6] bg-[#FDECEC] px-3.5 py-2.5 text-[13px] text-[#B3261E]">{err}</div>}

      <div className="mb-2.5 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[280px]">
          <span className="absolute left-[11px] top-1/2 -translate-y-1/2 text-[13px] text-[#9AA7A0]">🔍</span>
          <input className={`${FIELD_CLS} !h-[38px] !pl-8`} placeholder="Tìm mã hoặc tiêu đề..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select aria-label="Lọc trạng thái" className={`${FIELD_CLS} !h-[38px] !w-[160px]`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="SENT">Đã gửi</option>
          <option value="CLOSED">Đã đóng</option>
        </select>
        <div className="flex-1" />
        <button type="button" className={BTN_GREEN} onClick={() => setCreating(true)}>
          + Tạo yêu cầu báo giá
        </button>
      </div>

      <div className="max-h-[calc(100vh-200px)] overflow-auto rounded-[10px] border border-[#D3DCE3] bg-white">
        <table className={`w-full min-w-[760px] border-collapse transition-opacity ${loading && rows.length ? "opacity-55" : ""}`}>
          <thead>
            <tr>
              <th className={TH}>Mã</th>
              <th className={TH}>Tiêu đề</th>
              <th className={TH}>Hạn báo giá</th>
              <th className={TH}>Trạng thái</th>
              <th className={`${TH} text-center`}>Mặt hàng</th>
              <th className={`${TH} text-center`}>Đã nộp / đã mời</th>
            </tr>
          </thead>
          <tbody>
            {loading && rows.length === 0 && <SkeletonRows cols={6} cellStyle="padding:8px; border:1px solid #E4EAEF" />}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={6} className={`${TD} p-6 text-center text-[#8B9A90]`}>
                  Chưa có yêu cầu báo giá nào.
                </td>
              </tr>
            )}
            {rows.map((r, i) => {
              const meta = rfqStatusMeta(r.status);
              return (
                <tr key={r.id} className={`cursor-pointer hover:bg-[#EAF3EC] ${i % 2 ? "bg-[#FBFDFB]" : "bg-white"}`} onClick={() => open(r.id)}>
                  <td className={`${TD} whitespace-nowrap font-semibold text-[#1F7440]`}>{r.code}</td>
                  <td className={`${TD} max-w-[320px] truncate`} title={r.title}>
                    {r.title}
                  </td>
                  <td className={`${TD} whitespace-nowrap`}>{formatDateTime(r.deadline)}</td>
                  <td className={TD}>
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                  </td>
                  <td className={`${TD} text-center`}>{String(r.itemCount)}</td>
                  <td className={`${TD} text-center font-semibold tabular-nums`}>
                    {String(r.submittedCount)} / {String(r.invitationCount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 text-[11.5px] text-[#8B9A90]">Bấm vào một dòng để xem chi tiết, gửi cho nhà cung cấp và so sánh giá.</div>

      {creating && (
        <RfqCreateModal
          onClose={() => setCreating(false)}
          onCreated={(rfq) => {
            setCreating(false);
            open(rfq.id);
          }}
        />
      )}
    </div>
  );
}

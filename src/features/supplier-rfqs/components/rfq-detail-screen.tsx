"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getJSON, patchJSON, postJSON, putJSON, sendJSON } from "@/lib/api";
import { apiErrorMessage } from "@/lib/api-error";
import { Badge } from "@/components/shared/badge";
import { BTN_DANGER, BTN_GHOST, BTN_GREEN, ConfirmDialog } from "@/components/shared/modal";
import { PATHS } from "@/components/layout/routes";
import RfqInfoFields from "@/features/supplier-rfqs/components/rfq-info-fields";
import RfqItemsEditor from "@/features/supplier-rfqs/components/rfq-items-editor";
import RfqImageCard from "@/features/supplier-rfqs/components/rfq-image-card";
import RfqSendCard from "@/features/supplier-rfqs/components/rfq-send-card";
import RfqInvitationsTable from "@/features/supplier-rfqs/components/rfq-invitations-table";
import RfqComparePanel from "@/features/supplier-rfqs/components/rfq-compare-panel";
import RfqTestSendModal from "@/features/supplier-rfqs/components/rfq-test-send-modal";
import { rfqFieldErrors, rfqInfoSchema } from "@/features/supplier-rfqs/schemas/rfq-schema";
import { formatDateTime, toLocalInput } from "@/features/supplier-rfqs/utils/format";
import { infoFromDetail, infoPatchPayload, itemsToDrafts, validateItems, type ItemDraft, type ItemErrors, type RfqInfoForm } from "@/features/supplier-rfqs/utils/rfq-payload";
import { rfqStatusMeta } from "@/features/supplier-rfqs/utils/status";
import type { RfqDetail } from "@/features/supplier-rfqs/types";

function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-[#E4EAEF] bg-white p-4 sm:p-5">
      {title && <div className="mb-3 text-[14px] font-bold text-[#14261A]">{title}</div>}
      {children}
    </section>
  );
}

type Tab = "main" | "compare";

export default function RfqDetailScreen({ rfqId }: { rfqId: string }) {
  const router = useRouter();
  const [detail, setDetail] = useState<RfqDetail | null>(null);
  const [loadErr, setLoadErr] = useState("");
  const [info, setInfo] = useState<RfqInfoForm>({ title: "", note: "", currency: "VND", deadline: "" });
  const [infoErrors, setInfoErrors] = useState<Record<string, string>>({});
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [itemErrors, setItemErrors] = useState<ItemErrors>({});
  const [itemsDirty, setItemsDirty] = useState(false);
  const [tab, setTab] = useState<Tab>("main");
  const [compareKey, setCompareKey] = useState(0);
  const [savingInfo, setSavingInfo] = useState(false);
  const [savingItems, setSavingItems] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  const [confirm, setConfirm] = useState<"close" | "delete" | null>(null);
  const [acting, setActing] = useState(false);

  // resetForms=true: nạp lại form sửa từ server (lần đầu / sau khi lưu). false: chỉ làm mới dữ liệu hiển thị
  // (sau khi gửi, đổi ảnh) để không xoá những gì người dùng đang gõ dở.
  const load = useCallback(
    async (resetForms: boolean) => {
      try {
        const d = await getJSON<RfqDetail>(`/api/supplier-rfqs/${rfqId}`);
        setDetail(d);
        setLoadErr("");
        if (resetForms) {
          setInfo(infoFromDetail(d, toLocalInput(d.deadline)));
          setItems(itemsToDrafts(d.items));
          setItemsDirty(false);
        }
      } catch (e) {
        setLoadErr(apiErrorMessage(e, "Không tải được yêu cầu báo giá"));
      }
    },
    [rfqId],
  );

  useEffect(() => {
    (async () => {
      await load(true);
    })();
  }, [load]);

  const back = () => router.push(PATHS.rfqs);

  async function saveInfo() {
    if (!detail) return;
    const parsed = rfqInfoSchema.safeParse(info);
    if (!parsed.success) return void setInfoErrors(rfqFieldErrors(parsed.error.issues));
    setInfoErrors({});
    setSavingInfo(true);
    try {
      await patchJSON(`/api/supplier-rfqs/${rfqId}`, infoPatchPayload(info, !!detail.deadline));
      toast.success("Đã lưu thông tin");
      // Chỉ nạp lại phần thông tin (không đụng bảng mặt hàng đang sửa dở).
      const d = await getJSON<RfqDetail>(`/api/supplier-rfqs/${rfqId}`);
      setDetail(d);
      setInfo(infoFromDetail(d, toLocalInput(d.deadline)));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không lưu được thông tin"));
    } finally {
      setSavingInfo(false);
    }
  }

  async function saveItems() {
    const v = validateItems(items);
    setItemErrors(v.errors);
    if (!v.ok) return void toast.error(v.empty ? "Cần ít nhất một mặt hàng." : "Sửa các dòng báo đỏ.");
    setSavingItems(true);
    try {
      const d = await putJSON<RfqDetail>(`/api/supplier-rfqs/${rfqId}/items`, { items: v.items });
      setDetail(d);
      setItems(itemsToDrafts(d.items));
      setItemsDirty(false);
      toast.success("Đã lưu mặt hàng");
    } catch (e) {
      toast.error(apiErrorMessage(e, "Không lưu được mặt hàng"));
    } finally {
      setSavingItems(false);
    }
  }

  async function doConfirmed() {
    if (!confirm) return;
    setActing(true);
    try {
      if (confirm === "close") {
        const d = await postJSON<RfqDetail>(`/api/supplier-rfqs/${rfqId}/close`);
        setDetail(d);
        setCompareKey((k) => k + 1);
        toast.success("Đã đóng báo giá");
        setConfirm(null);
      } else {
        await sendJSON("DELETE", `/api/supplier-rfqs/${rfqId}`);
        toast.success("Đã xóa yêu cầu báo giá");
        back();
      }
    } catch (e) {
      toast.error(apiErrorMessage(e, confirm === "close" ? "Không đóng được báo giá" : "Không xóa được yêu cầu"));
      setConfirm(null);
    } finally {
      setActing(false);
    }
  }

  if (!detail) {
    return (
      <div>
        <button type="button" className={`${BTN_GHOST} mb-3`} onClick={back}>
          ‹ Danh sách
        </button>
        {loadErr ? (
          <div className="rounded-[10px] border border-[#F3C9C6] bg-[#FDECEC] px-3.5 py-2.5 text-[13px] text-[#B3261E]">{loadErr}</div>
        ) : (
          <div className="p-6 text-center text-[13px] text-[#8B9A90]">Đang tải...</div>
        )}
      </div>
    );
  }

  const meta = rfqStatusMeta(detail.status);
  const isDraft = detail.status === "DRAFT";
  const isClosed = detail.status === "CLOSED";
  const itemsLocked = !isDraft;
  const sendBlocked = isClosed
    ? "Báo giá đã đóng, không gửi thêm được."
    : itemsDirty
      ? "Bạn có thay đổi mặt hàng chưa lưu — hãy bấm “Lưu mặt hàng” trước khi gửi."
      : detail.items.length === 0
        ? "Cần ít nhất một mặt hàng trước khi gửi."
        : undefined;

  return (
    <div className="flex flex-col gap-3.5">
      {loadErr && <div className="rounded-[10px] border border-[#F3C9C6] bg-[#FDECEC] px-3.5 py-2.5 text-[13px] text-[#B3261E]">{loadErr}</div>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={BTN_GHOST} onClick={back}>
          ‹ Danh sách
        </button>
        <div className="min-w-0 flex-1 basis-[200px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] font-bold text-[#1F7440]">{detail.code}</span>
            <Badge tone={meta.tone}>{meta.label}</Badge>
          </div>
          <div className="truncate text-[17px] font-bold text-[#14261A]" title={detail.title}>
            {detail.title}
          </div>
          <div className="text-[12px] text-[#7B8A80]">
            Hạn báo giá: {formatDateTime(detail.deadline)} · Tạo lúc {formatDateTime(detail.createdAt)}
          </div>
        </div>
        <button type="button" className={BTN_GHOST} onClick={() => setTestOpen(true)}>
          Nhắn thử
        </button>
        {!isClosed && (
          <button type="button" className={BTN_DANGER} onClick={() => setConfirm("close")}>
            Đóng báo giá
          </button>
        )}
        {isDraft && (
          <button type="button" className={BTN_DANGER} onClick={() => setConfirm("delete")}>
            Xóa
          </button>
        )}
      </div>

      <div className="flex gap-1.5 rounded-xl bg-[#E9EEE9] p-1" role="tablist">
        {(
          [
            ["main", "Thông tin & gửi"],
            ["compare", "So sánh giá"],
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            className={`h-9 flex-1 cursor-pointer rounded-lg border-0 text-[13px] font-semibold ${tab === k ? "bg-white text-[#14261A] shadow-sm" : "bg-transparent text-[#7B8A80]"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "compare" && (
        <Card>
          <RfqComparePanel rfqId={rfqId} refreshKey={compareKey} />
        </Card>
      )}

      {tab === "main" && (
        <>
          <Card title="Thông tin chung">
            <RfqInfoFields form={info} onChange={setInfo} errors={infoErrors} disabled={isClosed} />
            {!isClosed && (
              <div className="mt-3">
                <button type="button" disabled={savingInfo} className={BTN_GREEN} onClick={saveInfo}>
                  {savingInfo ? "Đang lưu..." : "Lưu thông tin"}
                </button>
              </div>
            )}
          </Card>

          <Card title="Mặt hàng">
            {itemsLocked && <div className="mb-2 rounded-lg bg-[#F1F4F1] px-3 py-2 text-[12.5px] text-[#6B7A70]">Chỉ sửa được mặt hàng khi báo giá còn ở trạng thái Nháp (chưa gửi).</div>}
            <RfqItemsEditor
              items={items}
              onChange={(next) => {
                setItems(next);
                setItemsDirty(true);
              }}
              errors={itemErrors}
              disabled={itemsLocked}
            />
            {!itemsLocked && (
              <div className="mt-3">
                <button type="button" disabled={savingItems || !itemsDirty} className={BTN_GREEN} onClick={saveItems}>
                  {savingItems ? "Đang lưu..." : "Lưu mặt hàng"}
                </button>
              </div>
            )}
          </Card>

          <Card>
            <RfqImageCard rfqId={rfqId} hasImage={detail.hasImage} locked={isClosed} onChanged={() => void load(false)} />
          </Card>

          <Card>
            <RfqSendCard
              rfqId={rfqId}
              invitations={detail.invitations}
              canSend={!sendBlocked}
              blockedReason={sendBlocked}
              onSent={() => {
                void load(false);
                setCompareKey((k) => k + 1);
              }}
            />
          </Card>

          <Card title="Lời mời đã gửi">
            <RfqInvitationsTable invitations={detail.invitations} />
          </Card>
        </>
      )}

      {testOpen && <RfqTestSendModal rfqId={rfqId} onClose={() => setTestOpen(false)} />}

      {confirm && (
        <ConfirmDialog
          title={confirm === "close" ? "Đóng báo giá" : "Xóa yêu cầu báo giá"}
          danger
          busy={acting}
          confirmLabel={confirm === "close" ? "Đóng báo giá" : "Xóa"}
          text={
            confirm === "close"
              ? "Sau khi đóng, nhà cung cấp không nộp hoặc sửa giá được nữa và không gửi thêm lời mời. Không thể mở lại."
              : `Xóa yêu cầu ${detail.code}? Không thể hoàn tác.`
          }
          onConfirm={doConfirmed}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

/*
 * Modal + hộp xác nhận dùng chung cho các màn mới (Nhà cung cấp, Báo giá NCC).
 * Cùng giao diện với các modal cũ (nền mờ, bo góc 20px) nhưng viết bằng Tailwind
 * để feature mới không phải chép lại chuỗi style inline.
 */

// Token class dùng lại ở form các màn mới (khớp màu xanh của app).
export const FIELD_CLS =
  "h-10 w-full rounded-[9px] border-[1.5px] border-[#DFE6E0] bg-white px-[11px] text-[13.5px] text-[#14261A] outline-none focus:border-[#3EA85C] focus:shadow-[0_0_0_3px_rgba(62,168,92,.14)]";
export const LABEL_CLS = "mb-1 text-[12px] font-semibold text-[#3C4A40]";
export const BTN_GREEN =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border-0 bg-gradient-to-br from-[#3EA85C] to-[#1F7440] px-3.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_GHOST =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#DCE3DC] bg-white px-3 text-[13px] font-semibold text-[#4A5A4E] disabled:cursor-not-allowed disabled:opacity-50";
export const BTN_DANGER =
  "inline-flex h-9 cursor-pointer items-center justify-center rounded-lg border border-[#E4C7C5] bg-white px-3 text-[13px] font-semibold text-[#B3261E] disabled:cursor-not-allowed disabled:opacity-50";

export function Modal({
  title,
  onClose,
  children,
  maxWidth = 480,
  z = 60,
  busy = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: number;
  z?: number;
  busy?: boolean; // đang gửi/lưu: bỏ qua bấm nền và nút ✕ để khỏi đóng giữa chừng
}) {
  return (
    <div className="fixed inset-0 overflow-auto px-4 py-7" style={{ zIndex: z }} role="dialog" aria-modal="true" aria-label={title}>
      <div className="fixed inset-0 bg-[rgba(15,35,22,.45)] backdrop-blur-[3px]" onClick={() => !busy && onClose()} />
      <div
        className="relative z-[1] mx-auto w-full rounded-[20px] bg-white p-5 shadow-[0_30px_70px_-20px_rgba(8,40,24,.5)] sm:p-6"
        style={{ maxWidth }}
      >
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex-1 text-[17px] font-bold text-[#14261A]">{title}</div>
          <button
            type="button"
            aria-label="Đóng"
            className="h-8 w-8 cursor-pointer rounded-[9px] border-0 bg-[#F1F4F1] text-[#4A5A4E]"
            disabled={busy}
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title} onClose={onCancel} maxWidth={420} z={80} busy={busy}>
      <div className="mb-[18px] text-[13.5px] leading-[1.55] text-[#4A5A4E]">{text}</div>
      <div className="flex gap-2.5">
        <button
          type="button"
          disabled={busy}
          onClick={onConfirm}
          className={`h-11 flex-1 cursor-pointer rounded-[11px] border-0 text-[14px] font-semibold text-white disabled:opacity-50 ${danger ? "bg-[#B3261E]" : "bg-gradient-to-br from-[#3EA85C] to-[#1F7440]"}`}
        >
          {busy ? "Đang xử lý..." : confirmLabel}
        </button>
        <button type="button" disabled={busy} onClick={onCancel} className={`${BTN_GHOST} h-11`}>
          Hủy
        </button>
      </div>
    </Modal>
  );
}

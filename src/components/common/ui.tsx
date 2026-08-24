"use client";

import React, { useState } from "react";

// Chuyển chuỗi CSS ("display:flex; gap:10px") -> object style của React.
export function sx(str: string): React.CSSProperties {
  const o: Record<string, string> = {};
  if (!str) return o;
  for (const part of str.split(";")) {
    const i = part.indexOf(":");
    if (i === -1) continue;
    const rawKey = part.slice(0, i).trim();
    const val = part.slice(i + 1).trim();
    if (!rawKey) continue;
    // kebab-case -> camelCase (kể cả -webkit- -> Webkit)
    const key = rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    o[key] = val;
  }
  return o as React.CSSProperties;
}

type BtnProps = {
  s: string; // style cơ bản
  h?: string; // style khi hover
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
  title?: string;
  type?: "button" | "submit";
};

// Button có hover style (thay cho style-hover của dc).
export function HButton({ s, h, onClick, children, title, type = "button" }: BtnProps) {
  const [hover, setHover] = useState(false);
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...sx(s), ...(hover && h ? sx(h) : {}) }}
    >
      {children}
    </button>
  );
}

type DivProps = {
  s: string;
  h?: string;
  onClick?: (e: React.MouseEvent) => void;
  children?: React.ReactNode;
};

// Div/box có hover style.
export function HDiv({ s, h, onClick, children }: DivProps) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ ...sx(s), ...(hover && h ? sx(h) : {}) }}
    >
      {children}
    </div>
  );
}

type InputProps = {
  s: string;
  focus?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  className?: string;
  checked?: boolean;
  list?: string; // id của <datalist> để gợi ý giá trị (vẫn cho gõ mới)
};

// Input có focus style (thay cho style-focus).
export function HInput({ s, focus, className, ...rest }: InputProps) {
  const [foc, setFoc] = useState(false);
  return (
    <input
      {...rest}
      className={className}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{ ...sx(s), ...(foc && focus ? sx(focus) : {}) }}
    />
  );
}

type TaProps = {
  s: string;
  focus?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  rows?: number;
};

export function HTextarea({ s, focus, ...rest }: TaProps) {
  const [foc, setFoc] = useState(false);
  return (
    <textarea
      {...rest}
      onFocus={() => setFoc(true)}
      onBlur={() => setFoc(false)}
      style={{ ...sx(s), ...(foc && focus ? sx(focus) : {}) }}
    />
  );
}

// 1 thanh xám nhấp nháy (khung xương) — dùng bên trong ô bảng lúc đang tải.
export function SkeletonBar({ w = "70%", h = "12px" }: { w?: string; h?: string }) {
  return <div className="ago-skeleton" style={sx(`height:${h}; width:${w}`)} />;
}

// N dòng khung xương khớp đúng số cột của bảng — thay cho chớp "Chưa có dữ liệu"
// trong lúc chờ API trả về lần đầu. `cellStyle` truyền đúng token gtd của màn đó
// để border/padding khớp các dòng thật.
// Khung xương dạng CARD (icon tròn + 2 dòng chữ) — dùng cho lưới template/dashboard.
export function SkeletonCard() {
  return (
    <div
      style={sx(
        "display:flex; align-items:center; gap:12px; background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:16px",
      )}
    >
      <div className="ago-skeleton" style={sx("width:44px; height:44px; border-radius:12px; flex-shrink:0")} />
      <div style={sx("min-width:0; flex:1; display:flex; flex-direction:column; gap:8px")}>
        <SkeletonBar w="65%" h="14px" />
        <SkeletonBar w="45%" h="11px" />
      </div>
    </div>
  );
}

const SKELETON_WIDTHS = ["82%", "55%", "68%", "40%", "60%", "48%", "74%", "36%"];
export function SkeletonRows({
  cols,
  rows = 6,
  cellStyle,
}: {
  cols: number;
  rows?: number;
  cellStyle: string;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td key={c} style={sx(cellStyle)}>
              <SkeletonBar w={SKELETON_WIDTHS[(r + c) % SKELETON_WIDTHS.length]} />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

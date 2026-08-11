"use client";

import { useEffect, useRef, useState } from "react";
import { sx } from "@/components/common/ui";
import { COUNTRIES, flagOf, findCountry, type Country } from "@/components/common/countries";

// Dropdown chọn quốc gia: in cứng toàn bộ quốc gia + ô tìm kiếm nhanh.
// value = tên quốc gia đang lưu (hoặc giá trị tự do cũ). onSelect trả về Country.
export function CountrySelect({
  value,
  onSelect,
  placeholder = "Chọn quốc gia...",
}: {
  value: string;
  onSelect: (c: Country) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const kw = q.trim().toLowerCase();
  const list = kw
    ? COUNTRIES.filter(
        (c) => c.name.toLowerCase().includes(kw) || c.dial.includes(kw) || c.iso2.toLowerCase().includes(kw),
      )
    : COUNTRIES;

  const current = findCountry(value);
  const btn =
    "height:40px; width:100%; border:1.5px solid #DFE6E0; border-radius:9px; padding:0 11px; font-size:13.5px; color:#14261A; background:#fff; cursor:pointer; display:flex; align-items:center; gap:7px; text-align:left";

  return (
    <div ref={boxRef} style={sx("position:relative")}>
      <button type="button" onClick={() => { setOpen((o) => !o); setQ(""); }} style={sx(btn)}>
        <span style={sx("font-size:16px")}>{current ? flagOf(current.iso2) : "🌐"}</span>
        <span style={sx(`flex:1; ${value ? "" : "color:#9AA7A0"}; white-space:nowrap; overflow:hidden; text-overflow:ellipsis`)}>
          {current ? `${current.name} (+${current.dial})` : value || placeholder}
        </span>
        <span style={sx("color:#9AA7A0; font-size:11px")}>▾</span>
      </button>

      {open && (
        <div style={sx("position:absolute; z-index:90; top:calc(100% + 4px); left:0; right:0; background:#fff; border:1px solid #D9E0DA; border-radius:11px; box-shadow:0 18px 40px -16px rgba(8,40,24,.4); overflow:hidden")}>
          <div style={sx("padding:8px; border-bottom:1px solid #EEF2EE")}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm quốc gia hoặc mã vùng..."
              style={sx("width:100%; height:34px; border:1.5px solid #DFE6E0; border-radius:8px; padding:0 10px; font-size:13px; color:#14261A; outline:none")}
            />
          </div>
          <div style={sx("max-height:240px; overflow:auto")}>
            {list.length === 0 && <div style={sx("padding:12px; font-size:13px; color:#8B9A90; text-align:center")}>Không tìm thấy quốc gia.</div>}
            {list.map((c) => {
              const on = current?.iso2 === c.iso2;
              return (
                <div
                  key={c.iso2}
                  onClick={() => { onSelect(c); setOpen(false); setQ(""); }}
                  style={sx(`display:flex; align-items:center; gap:9px; padding:8px 12px; cursor:pointer; font-size:13.5px; color:#1B2A20; background:${on ? "#EAF3EC" : "#fff"}`)}
                >
                  <span style={sx("font-size:16px")}>{flagOf(c.iso2)}</span>
                  <span style={sx("flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{c.name}</span>
                  <span style={sx("color:#8B9A90; font-size:12.5px")}>+{c.dial}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Ô số điện thoại có mã vùng TÁCH RIÊNG: [ +84 ][ số cục bộ ].
// value = số đầy đủ (dial + local); onChange trả về số đầy đủ.
export function PhoneWithDial({
  dial,
  value,
  onChange,
  placeholder,
}: {
  dial: string; // mã vùng quốc gia đang chọn ("" nếu chưa chọn)
  value: string;
  onChange: (full: string) => void;
  placeholder?: string;
}) {
  const [foc, setFoc] = useState(false);
  const disabled = !dial; // chưa chọn quốc gia -> khoá, bắt chọn quốc gia trước
  const local = dial && value.startsWith(dial) ? value.slice(dial.length) : value;
  const box = `display:flex; align-items:center; height:40px; border-width:1.5px; border-style:solid; border-radius:9px; overflow:hidden; background:${disabled ? "#F4F6F4" : "#fff"}; border-color:${foc ? "#3EA85C" : "#DFE6E0"}; ${foc ? "box-shadow:0 0 0 3px rgba(62,168,92,.14)" : ""}`;
  return (
    <div style={sx(box)}>
      {dial && (
        <span style={sx("align-self:stretch; display:flex; align-items:center; padding:0 11px; background:#F1F5F1; color:#3C4A40; font-size:13px; font-weight:700; border-right:1px solid #E4EAE4")}>+{dial}</span>
      )}
      <input
        disabled={disabled}
        value={local}
        onChange={(e) => { const l = e.target.value.replace(/\D/g, ""); onChange(l ? (dial || "") + l : ""); }}
        onFocus={() => setFoc(true)}
        onBlur={() => setFoc(false)}
        placeholder={disabled ? "Chọn quốc gia trước" : placeholder}
        inputMode="numeric"
        style={sx(`flex:1; min-width:0; border:none; outline:none; background:transparent; padding:0 11px; font-size:13.5px; color:${disabled ? "#9AA7A0" : "#14261A"}; ${disabled ? "cursor:not-allowed" : ""}`)}
      />
    </div>
  );
}

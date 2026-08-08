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

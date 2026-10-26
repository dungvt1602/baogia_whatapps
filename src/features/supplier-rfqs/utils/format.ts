/*
 * Định dạng số/ngày cho màn RFQ.
 * Tiền và số lượng từ BE là CHUỖI thập phân — mọi hàm ở đây thao tác trên chuỗi,
 * không đi qua Number để khỏi mất độ chính xác (VD "1234567890123.4567").
 */

const DECIMAL_RE = /^-?\d+(\.\d+)?$/;

// "1500000.5000" -> "1.500.000,5" (kiểu vi-VN, bỏ số 0 thừa phần lẻ). Không phải số thì trả nguyên.
export function formatDecimal(value: string | null | undefined): string {
  if (value == null || value === "") return "—";
  const s = String(value).trim();
  if (!DECIMAL_RE.test(s)) return s;
  const neg = s.startsWith("-");
  const [intRaw, fracRaw = ""] = (neg ? s.slice(1) : s).split(".");
  const int = intRaw.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const frac = fracRaw.replace(/0+$/, "");
  return `${neg ? "-" : ""}${int}${frac ? "," + frac : ""}`;
}

export function formatMoney(value: string | null | undefined, currency?: string | null): string {
  const n = formatDecimal(value);
  if (n === "—") return n;
  return currency ? `${n} ${currency}` : n;
}

const pad = (n: number) => String(n).padStart(2, "0");

// ISO -> "dd/MM/yyyy HH:mm" theo giờ máy người xem. Rỗng/sai -> "—".
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ISO -> giá trị cho <input type="datetime-local"> ("yyyy-MM-ddTHH:mm", giờ máy).
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Giá trị datetime-local -> ISO (UTC) gửi BE. Rỗng/sai -> null.
export function fromLocalInput(local: string): string | null {
  if (!local) return null;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

// message có khi lỗi mang ý nghĩa riêng (mơ hồ dấu phân cách / vượt giới hạn); không có thì caller dùng câu mặc định theo ô.
export type DecimalParse = { ok: true; value: string } | { ok: false; message?: string };

export const AMBIGUOUS_SEPARATOR_MSG = "Dấu phân cách không rõ: nhập 25000 hoặc 25.5 (dùng dấu chấm cho số lẻ)";
export const DECIMAL_LIMIT_MSG = "Quá lớn: tối đa 14 chữ số phần nguyên và 4 chữ số thập phân";

/*
 * Chuẩn hoá ô nhập số KHÔNG ÂM thành chuỗi thập phân (dấu chấm). Mục tiêu: KHÔNG BAO GIỜ hiểu sai
 * lặng lẽ định dạng kiểu VN/EN ("25.000" không được thành 25).
 *  - rỗng -> ok, value "" (ô tuỳ chọn)
 *  - có CẢ "." và "," -> lỗi mơ hồ ("1.500,5")
 *  - một dấu phân cách theo sau đúng 3 chữ số, hoặc dấu lặp lại ("25.000", "25,000", "1.500.000") -> lỗi mơ hồ
 *  - "1,5" -> "1.5" (một dấu phẩy, không phải 3 chữ số sau)
 *  - âm, chữ -> lỗi (không message: caller dùng câu theo ô)
 *  - giới hạn BE: tối đa 14 chữ số nguyên + 4 chữ số lẻ
 */
export function parseDecimalInput(raw: string): DecimalParse {
  let s = raw.trim().replace(/\s+/g, "");
  if (s === "") return { ok: true, value: "" };
  if (!/^[\d.,]+$/.test(s)) return { ok: false };
  const dots = s.split(".").length - 1;
  const commas = s.split(",").length - 1;
  if (dots > 0 && commas > 0) return { ok: false, message: AMBIGUOUS_SEPARATOR_MSG };
  const sep = dots > 0 ? "." : commas > 0 ? "," : "";
  if (sep) {
    const count = dots + commas;
    const parts = s.split(sep);
    if (count > 1 || parts[1].length === 3) return { ok: false, message: AMBIGUOUS_SEPARATOR_MSG };
    s = parts.join(".");
  }
  if (s === "" || !/^\d*(\.\d+)?$/.test(s)) return { ok: false };
  if (s.startsWith(".")) s = "0" + s;
  const [int, frac = ""] = s.split(".");
  if (int.replace(/^0+(?=\d)/, "").length > 14 || frac.length > 4) return { ok: false, message: DECIMAL_LIMIT_MSG };
  return { ok: true, value: s };
}

// Giá trị thập phân bằng 0 ("0", "0.00")?
export const isZeroDecimal = (v: string) => /^0*(\.0*)?$/.test(v);

// So sánh hai chuỗi thập phân không âm: <0, 0, >0 (không dùng Number).
export function compareDecimal(a: string, b: string): number {
  const [ai, af = ""] = a.split(".");
  const [bi, bf = ""] = b.split(".");
  const ni = ai.replace(/^0+(?=\d)/, "");
  const nj = bi.replace(/^0+(?=\d)/, "");
  if (ni.length !== nj.length) return ni.length - nj.length;
  if (ni !== nj) return ni < nj ? -1 : 1;
  const len = Math.max(af.length, bf.length);
  const fa = af.padEnd(len, "0");
  const fb = bf.padEnd(len, "0");
  return fa === fb ? 0 : fa < fb ? -1 : 1;
}

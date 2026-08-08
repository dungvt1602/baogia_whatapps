import { ImageResponse } from "next/og";
import { readFile } from "fs/promises";
import path from "path";

// Sinh ẢNH báo giá (PNG) từ dữ liệu quotation + items bằng next/og (Satori).
// Dùng cho: xem trước ảnh (route) và upload lên WhatsApp làm header template.

type QData = {
  code: string;
  title: string | null;
  currency: string;
  market: string | null;
  validUntil: Date | null;
};
type Item = {
  no: number;
  product: string;
  packing: string | null;
  unit: string | null;
  quantity: unknown;
  price: unknown;
};

let fontsCache: { name: string; data: Buffer; weight: 400 | 600; style: "normal" }[] | null = null;

async function loadFonts() {
  if (fontsCache) return fontsCache;
  const dir = path.join(process.cwd(), "public", "fonts");
  const [reg, sb] = await Promise.all([
    readFile(path.join(dir, "BeVietnamPro-Regular.ttf")),
    readFile(path.join(dir, "BeVietnamPro-SemiBold.ttf")),
  ]);
  fontsCache = [
    { name: "Be Vietnam Pro", data: reg, weight: 400, style: "normal" },
    { name: "Be Vietnam Pro", data: sb, weight: 600, style: "normal" },
  ];
  return fontsCache;
}

const n = (v: unknown) => {
  const x = Number(v ?? 0);
  return Number.isFinite(x) ? x : 0;
};
const money = (v: unknown, cur: string) => `${n(v).toLocaleString("vi-VN")} ${cur}`;
const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric" }).format(d) : "—";

export async function renderQuotationImage(q: QData, items: Item[]): Promise<ImageResponse> {
  const fonts = await loadFonts();
  const width = 820;
  const rowH = 44;
  const height = 210 + Math.max(items.length, 1) * rowH + 70;
  const total = items.reduce((s, it) => s + n(it.quantity) * n(it.price), 0);

  const cell = (flex: number, align: "flex-start" | "flex-end" | "center") => ({
    display: "flex",
    flex,
    justifyContent: align,
    alignItems: "center",
    padding: "0 10px",
  });

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#ffffff", fontFamily: "Be Vietnam Pro", color: "#14261A" }}>
        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", padding: "26px 32px", background: "linear-gradient(120deg,#1F7440,#123E24)", color: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600, flex: 1 }}>BÁO GIÁ · {q.code}</div>
            {q.market ? <div style={{ display: "flex", fontSize: 18, color: "#9BD1AE" }}>{q.market}</div> : <div style={{ display: "flex" }} />}
          </div>
          <div style={{ display: "flex", fontSize: 18, color: "#CDEBD6", marginTop: 6 }}>{q.title || "Ago Group"}</div>
        </div>

        {/* Table header */}
        <div style={{ display: "flex", background: "#EAF3EC", color: "#1F7440", fontWeight: 600, fontSize: 15, height: 42, alignItems: "center", borderBottom: "2px solid #CBE9D6" }}>
          <div style={cell(0.6, "center")}>#</div>
          <div style={cell(3.4, "flex-start")}>Mặt hàng</div>
          <div style={cell(1.6, "flex-end")}>Số lượng</div>
          <div style={cell(1.8, "flex-end")}>Đơn giá</div>
          <div style={cell(2, "flex-end")}>Thành tiền</div>
        </div>

        {/* Rows */}
        {items.map((it, i) => (
          <div key={i} style={{ display: "flex", fontSize: 15, height: rowH, alignItems: "center", background: i % 2 ? "#F7FAF7" : "#fff", borderBottom: "1px solid #EEF2EE" }}>
            <div style={cell(0.6, "center")}>{it.no || i + 1}</div>
            <div style={{ ...cell(3.4, "flex-start"), flexDirection: "column", alignItems: "flex-start", justifyContent: "center" }}>
              <div style={{ display: "flex", fontWeight: 600 }}>{it.product}</div>
              {it.packing ? <div style={{ display: "flex", fontSize: 12, color: "#8B9A90" }}>{it.packing}</div> : <div style={{ display: "flex" }} />}
            </div>
            <div style={cell(1.6, "flex-end")}>{n(it.quantity).toLocaleString("vi-VN")} {it.unit || ""}</div>
            <div style={cell(1.8, "flex-end")}>{money(it.price, q.currency)}</div>
            <div style={{ ...cell(2, "flex-end"), fontWeight: 600 }}>{money(n(it.quantity) * n(it.price), q.currency)}</div>
          </div>
        ))}

        {/* Total */}
        <div style={{ display: "flex", alignItems: "center", height: 52, background: "#14261A", color: "#fff", padding: "0 20px" }}>
          <div style={{ display: "flex", flex: 1, fontSize: 16 }}>Tổng giá trị</div>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 600 }}>{money(total, q.currency)}</div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", alignItems: "center", padding: "0 20px", flex: 1, color: "#7B8A80", fontSize: 13 }}>
          <div style={{ display: "flex", flex: 1 }}>Hiệu lực đến: {fmtDate(q.validUntil)}</div>
          <div style={{ display: "flex" }}>Ago Group — agoexim.com</div>
        </div>
      </div>
    ),
    { width, height, fonts },
  );
}

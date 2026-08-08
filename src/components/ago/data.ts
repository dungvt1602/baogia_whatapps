// Dữ liệu mẫu cho prototype (dịch nguyên từ thiết kế dc).
// Sau này thay bằng dữ liệu thật từ API/Prisma.

export type Quote = {
  id: string;
  code: string;
  title: string;
  customer: string;
  market: string;
  cat: string;
  product: string;
  qty: string;
  value: string;
  currency: string;
  status: string;
  owner: string;
  icon: string;
  tint: string;
  incoterm: string;
  payment: string;
  ship: string;
  issued: string;
  valid: string;
};

export const STATUS: Record<string, { color: string; bg: string }> = {
  "Đã gửi": { color: "#1F7440", bg: "#E7F5EC" },
  "Chờ phản hồi": { color: "#B07208", bg: "#FDF3E0" },
  "Đã chốt": { color: "#12603A", bg: "#DEF3E6" },
  "Từ chối": { color: "#B3261E", bg: "#FDECEC" },
};

export const QUOTES: Quote[] = [
  { id: "q1", code: "BG-2608-014", title: "Thanh long ruột đỏ xuất Đức — Q3", customer: "Fresh Orient GmbH", market: "Đức", cat: "Trái cây tươi", product: "Thanh long ruột đỏ", qty: "2 x 40ft RF", value: "$48.200", currency: "USD", status: "Đã gửi", owner: "Ngọc Anh", icon: "🐉", tint: "#FDEBEF", incoterm: "CIF Hamburg", payment: "T/T 30% trả trước", ship: "15/09/2026", issued: "04/08/2026", valid: "20/08/2026" },
  { id: "q2", code: "BG-2608-013", title: "Xoài cát Hoà Lộc — lô tháng 9", customer: "Al Rawabi Trading", market: "UAE", cat: "Trái cây tươi", product: "Xoài cát Hoà Lộc", qty: "1 x 40ft RF", value: "$26.500", currency: "USD", status: "Chờ phản hồi", owner: "Minh Quân", icon: "🥭", tint: "#FEF4E4", incoterm: "CFR Jebel Ali", payment: "L/C at sight", ship: "02/09/2026", issued: "03/08/2026", valid: "18/08/2026" },
  { id: "q3", code: "BG-2608-011", title: "Dừa tươi gọt vỏ đi Mỹ — 3 cont", customer: "Sunrise Produce Co.", market: "Hoa Kỳ", cat: "Trái cây tươi", product: "Dừa tươi gọt vỏ", qty: "3 x 40ft RF", value: "$61.900", currency: "USD", status: "Đã chốt", owner: "Ngọc Anh", icon: "🥥", tint: "#EAF3EC", incoterm: "FOB Cát Lái", payment: "T/T 100% trước giao", ship: "28/08/2026", issued: "30/07/2026", valid: "12/08/2026" },
  { id: "q4", code: "BG-2608-009", title: "Chuối già Nam Mỹ — Yokohama", customer: "Nihon Fruits K.K.", market: "Nhật Bản", cat: "Trái cây tươi", product: "Chuối già Nam Mỹ", qty: "2 x 40ft RF", value: "$33.400", currency: "USD", status: "Chờ phản hồi", owner: "Thu Hà", icon: "🍌", tint: "#FCF6DF", incoterm: "CIF Yokohama", payment: "T/T 50/50", ship: "20/09/2026", issued: "28/07/2026", valid: "22/08/2026" },
  { id: "q5", code: "BG-2608-006", title: "Bưởi da xanh — thị trường Anh", customer: "Golden Basket Ltd.", market: "Anh", cat: "Trái cây tươi", product: "Bưởi da xanh", qty: "1 x 40ft RF", value: "$19.800", currency: "USD", status: "Từ chối", owner: "Minh Quân", icon: "🍊", tint: "#F0F2E9", incoterm: "CIF Felixstowe", payment: "T/T 30% trả trước", ship: "—", issued: "25/07/2026", valid: "05/08/2026" },
  { id: "q6", code: "BG-2608-004", title: "Vải thiều đông lạnh — Busan", customer: "Seoul Fresh Mart", market: "Hàn Quốc", cat: "Đông lạnh", product: "Vải thiều Lục Ngạn", qty: "2 x 20ft RF", value: "$28.700", currency: "USD", status: "Đã gửi", owner: "Thu Hà", icon: "🍒", tint: "#FBEAEA", incoterm: "CIF Busan", payment: "L/C 60 days", ship: "10/09/2026", issued: "22/07/2026", valid: "25/08/2026" },
];

export type Pending = { id: string; name: string; email: string; dept: string; time: string };
export type Member = { id: string; name: string; email: string; dept: string; role: string; active: boolean };
export type Tpl = { id: string; name: string; icon: string; content: string; updated: string; by: string; sends: number };
export type Cust = { id: string; name: string; market: string; tags: string[]; quotes: number; last: string; phone: string; email: string };

export const INIT_PENDING: Pending[] = [
  { id: "p1", name: "Vũ Đức Long", email: "duc.long@agogroup.vn", dept: "Kinh doanh", time: "2 giờ trước" },
  { id: "p2", name: "Hoàng Mai Chi", email: "mai.chi@agogroup.vn", dept: "Chứng từ", time: "Hôm qua" },
];

export const INIT_MEMBERS: Member[] = [
  { id: "m1", name: "Trần Quốc Bảo", email: "giam.doc@agogroup.vn", dept: "Ban giám đốc", role: "Admin", active: true },
  { id: "m2", name: "Lê Ngọc Anh", email: "ngoc.anh@agogroup.vn", dept: "Kinh doanh", role: "Nhân viên", active: true },
  { id: "m3", name: "Phạm Minh Quân", email: "minh.quan@agogroup.vn", dept: "Kinh doanh", role: "Nhân viên", active: true },
  { id: "m4", name: "Nguyễn Thu Hà", email: "thu.ha@agogroup.vn", dept: "Xuất khẩu", role: "Nhân viên", active: true },
  { id: "m5", name: "Đỗ Hải Yến", email: "hai.yen@agogroup.vn", dept: "Chứng từ", role: "Nhân viên", active: false },
];

export const INIT_QUOTE_TPLS: Record<string, Tpl[]> = {
  q1: [
    { id: "t1", name: "Chuẩn quốc tế", icon: "🌐", content: "Kính gửi {khách hàng},\n\nAgo Group xin gửi báo giá {mã} cho {mặt hàng} — {số lượng}, điều kiện {incoterm}, tổng giá trị {giá}.\nThanh toán: {thanh toán}. Hiệu lực đến {hiệu lực}.\n\nRất mong nhận phản hồi từ Quý công ty.", updated: "Hôm qua, 16:40", by: "Lê Ngọc Anh", sends: 3 },
    { id: "t2", name: "Ngắn gọn", icon: "⚡", content: "{mặt hàng} — {số lượng}\nGiá: {giá} ({incoterm})\nHiệu lực đến {hiệu lực}.", updated: "04/08/2026", by: "Lê Ngọc Anh", sends: 1 },
  ],
  q2: [
    { id: "t3", name: "Chi tiết đầy đủ", icon: "📋", content: "Kính gửi {khách hàng},\n\nAgo Group xin gửi báo giá {mã}:\n• Mặt hàng: {mặt hàng}\n• Số lượng: {số lượng}\n• Đóng gói: thùng carton 10kg\n• Điều kiện: {incoterm}\n• Thanh toán: {thanh toán}\n• Tổng giá trị: {giá}\n• Hiệu lực đến: {hiệu lực}", updated: "03/08/2026", by: "Minh Quân", sends: 2 },
  ],
  q3: [
    { id: "t4", name: "Chuẩn quốc tế", icon: "🌐", content: "Kính gửi {khách hàng},\n\nAgo Group xin gửi báo giá {mã} cho {mặt hàng} — {số lượng}, điều kiện {incoterm}, tổng giá trị {giá}.", updated: "01/08/2026", by: "Ngọc Anh", sends: 4 },
    { id: "t5", name: "Follow-up", icon: "🔔", content: "Chào {khách hàng},\n\nAgo Group xin nhắc lại báo giá {mã} gửi ngày {ngày gửi} — hiệu lực đến {hiệu lực}. Rất mong nhận phản hồi từ Quý công ty.", updated: "02/08/2026", by: "Ngọc Anh", sends: 1 },
  ],
  q4: [],
  q5: [],
  q6: [],
};

export const INIT_CUSTOMERS: Cust[] = [
  { id: "c1", name: "Fresh Orient GmbH", market: "Hamburg, Đức", tags: ["Thanh long", "Chanh dây"], quotes: 14, last: "2 ngày trước", phone: "+49 40 5551 234", email: "import@freshorient.de" },
  { id: "c2", name: "Al Rawabi Trading", market: "Dubai, UAE", tags: ["Xoài", "Dừa"], quotes: 9, last: "Hôm nay", phone: "+971 4 555 8890", email: "buy@alrawabi.ae" },
  { id: "c3", name: "Sunrise Produce Co.", market: "Los Angeles, Hoa Kỳ", tags: ["Dừa", "Bưởi"], quotes: 21, last: "5 ngày trước", phone: "+1 213 555 0147", email: "sourcing@sunriseproduce.com" },
  { id: "c4", name: "Nihon Fruits K.K.", market: "Tokyo, Nhật Bản", tags: ["Chuối", "Vải"], quotes: 11, last: "Hôm qua", phone: "+81 3 5555 6721", email: "trade@nihonfruits.jp" },
  { id: "c5", name: "Golden Basket Ltd.", market: "London, Anh", tags: ["Bưởi"], quotes: 6, last: "2 tuần trước", phone: "+44 20 7555 3402", email: "orders@goldenbasket.co.uk" },
  { id: "c6", name: "Seoul Fresh Mart", market: "Busan, Hàn Quốc", tags: ["Vải", "Nhãn"], quotes: 17, last: "3 ngày trước", phone: "+82 51 555 7788", email: "fresh@seoulmart.kr" },
];

export const LOGS = [
  { who: "Lê Ngọc Anh", act: "Gửi báo giá BG-2608-014 qua WhatsApp", time: "09:42 hôm nay", dot: "#25D366" },
  { who: "Phạm Minh Quân", act: "Tạo báo giá BG-2608-015 cho Al Rawabi Trading", time: "09:10 hôm nay", dot: "#3EA85C" },
  { who: "Trần Quốc Bảo", act: "Duyệt giá báo giá BG-2608-014", time: "08:55 hôm nay", dot: "#B07208" },
  { who: "Nguyễn Thu Hà", act: "Cập nhật trạng thái BG-2608-009 → Chờ phản hồi", time: "17:20 hôm qua", dot: "#3EA85C" },
  { who: "Lê Ngọc Anh", act: "Gửi báo giá BG-2608-013 qua Zalo", time: "16:40 hôm qua", dot: "#0068FF" },
  { who: "Trần Quốc Bảo", act: "Duyệt tài khoản mới hai.yen@agogroup.vn", time: "11:02 hôm qua", dot: "#B07208" },
  { who: "Đỗ Hải Yến", act: "Đăng nhập lần đầu", time: "11:15 hôm qua", dot: "#C6D3C9" },
  { who: "Phạm Minh Quân", act: "Gửi báo giá BG-2608-006 qua Telegram", time: "04/08/2026", dot: "#2AABEE" },
];

export const STATS = [
  { label: "Báo giá tháng này", value: "128", delta: "▲ 12% so với tháng trước", color: "#1F7440" },
  { label: "Chờ phản hồi", value: "23", delta: "3 quá hạn 5 ngày", color: "#B07208" },
  { label: "Tỷ lệ chốt", value: "34%", delta: "▲ 4 điểm", color: "#1F7440" },
  { label: "Giá trị đã chốt", value: "$412K", delta: "Quý III/2026", color: "#7B8A80" },
];

export const DASH_CHANNELS = [
  { name: "WhatsApp", count: "46", pct: "82%", color: "#25D366" },
  { name: "Zalo", count: "31", pct: "56%", color: "#0068FF" },
  { name: "Telegram", count: "17", pct: "31%", color: "#2AABEE" },
];

export const initials = (name: string, sliceStart = false) => {
  const parts = name.trim().split(/\s+/);
  const picked = sliceStart ? parts.slice(0, 2) : parts.slice(-2);
  return picked.map((x) => x[0]).join("").toUpperCase();
};

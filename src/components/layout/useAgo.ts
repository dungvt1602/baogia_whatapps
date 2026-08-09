"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { keyToPath, pathToKey } from "@/components/layout/routes";
import type { AgoState } from "@/components/layout/state";
import {
  QUOTES,
  STATUS,
  STATS,
  LOGS,
  DASH_CHANNELS,
  INIT_PENDING,
  INIT_MEMBERS,
  INIT_QUOTE_TPLS,
  INIT_CUSTOMERS,
  initials,
  type Quote,
} from "@/components/layout/data";

const INIT: AgoState = {
  screen: "login",
  email: "ngoc.anh@agogroup.vn",
  password: "••••••••",
  role: "staff",
  loginError: false,
  page: "dash",
  quoteId: "q1",
  filter: "Tất cả",
  sentMsg: "",
  navOpen: false,
  w: 1280,
  templateKey: "std",
  regName: "",
  regEmail: "",
  regPass: "",
  regPass2: "",
  regError: "",
  regDone: false,
  showPass: false,
  remember: true,
  pending: INIT_PENDING,
  chanOn: { wa: true, zalo: true, tg: false },
  approvedMsg: "",
  members: INIT_MEMBERS,
  memberMenu: "",
  tplQuoteId: "",
  tplOpen: false,
  tplForm: { id: "", qid: "", name: "", icon: "📄", content: "" },
  tplMenu: "",
  quoteTpls: INIT_QUOTE_TPLS,
  uOpen: false,
  uForm: { id: "", name: "", email: "", dept: "", role: "Nhân viên" },
  cOpen: false,
  cForm: { id: "", name: "", market: "", tags: "" },
  custList: INIT_CUSTOMERS,
  userName: "",
  userInitials: "",
};

export function useAgo() {
  const [st, setSt] = useState<AgoState>(INIT);
  const patch = (p: Partial<AgoState>) => setSt((s) => ({ ...s, ...p }));
  const patchFn = (fn: (s: AgoState) => Partial<AgoState>) =>
    setSt((s) => ({ ...s, ...fn(s) }));

  const router = useRouter();
  const pathname = usePathname();
  const { session, logout: authLogout } = useAuth();

  // Màn hiện tại suy từ URL (route thật).
  const page = pathToKey(pathname);
  const userName = session?.userName || "Lê Ngọc Anh";
  const userInitials = session?.userInitials || "NA";

  useEffect(() => {
    const onResize = () => patch({ w: window.innerWidth });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Điều hướng = đổi URL.
  const go = (key: string) => {
    patch({ navOpen: false, sentMsg: "" });
    router.push(keyToPath(key));
  };

  const decorate = (q: Quote) => {
    const s = STATUS[q.status];
    return {
      ...q,
      statusColor: s.color,
      statusBg: s.bg,
      open: () => { patch({ quoteId: q.id, sentMsg: "" }); router.push(keyToPath("template")); },
    };
  };

  const narrow = st.w < 900;
  const tiny = st.w < 640;
  const isAdmin = session?.role === "admin";

  const tab = (on: boolean) =>
    `border:none; border-radius:8px; padding:7px 14px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s; background:${on ? "#fff" : "transparent"}; color:${on ? "#14261A" : "#7B8A80"}; box-shadow:${on ? "0 1px 3px rgba(0,0,0,.09)" : "none"}`;

  const navDef = [
    { key: "dash", label: "Tổng quan", icon: "◈", badge: "" },
    { key: "quotes", label: "Báo giá", icon: "▤", badge: "6" },
    { key: "customers", label: "Khách hàng", icon: "◎", badge: "" },
    { key: "products", label: "Sản phẩm", icon: "🍎", badge: "" },
    { key: "tpl", label: "Template", icon: "❖", badge: "" },
    { key: "send", label: "Gửi báo giá", icon: "📤", badge: "" },
    ...(isAdmin
      ? [
          { key: "team", label: "Người dùng", icon: "☖", badge: st.pending.length ? String(st.pending.length) : "" },
          { key: "channels", label: "Kênh gửi", icon: "⇄", badge: "" },
          { key: "logs", label: "Nhật ký", icon: "≡", badge: "" },
        ]
      : []),
  ];
  const active = page === "detail" || page === "template" ? "quotes" : page;

  const titles: Record<string, [string, string]> = {
    dash: ["Tổng quan", "Xin chào, hôm nay có 4 báo giá cần theo dõi"],
    quotes: ["Báo giá", "Chọn một báo giá để bắt đầu"],
    template: ["Thông tin báo giá", "Người tạo, lịch sử template và chọn mẫu gửi"],
    detail: ["Chi tiết báo giá", "Xem, chỉnh sửa và gửi cho khách hàng"],
    customers: ["Khách hàng", "42 khách hàng trên 18 thị trường"],
    team: ["Quản trị người dùng", "Duyệt tài khoản mới và phân quyền"],
    channels: ["Kênh gửi báo giá", "Kết nối WhatsApp, Zalo và Telegram"],
    logs: ["Nhật ký hoạt động", "Toàn bộ thao tác trên hệ thống"],
    new: ["Tạo báo giá", "Điền thông tin và gửi ngay qua kênh chat"],
    tpl: ["Quản lý template", "Mỗi báo giá có bộ template riêng để gửi khách"],
    send: ["Gửi báo giá", "Chọn báo giá và template để gửi cho khách hàng"],
    products: ["Sản phẩm", "Kho sản phẩm dùng chung — chỉnh giá & thông tin"],
  };

  const q = QUOTES.find((x) => x.id === st.quoteId) || QUOTES[0];
  const cur = decorate(q);

  const filters = ["Tất cả", "Đã gửi", "Chờ phản hồi", "Đã chốt", "Từ chối"].map((f) => ({
    label: f,
    pick: () => patch({ filter: f }),
    style: `border:1px solid ${st.filter === f ? "#1F7440" : "#E1E7E1"}; background:${st.filter === f ? "#1F7440" : "#fff"}; color:${st.filter === f ? "#fff" : "#4A5A4E"}; border-radius:20px; padding:8px 15px; font-size:13px; font-weight:600; cursor:pointer; transition:all .15s`,
  }));

  const chanBtn =
    "display:flex; align-items:center; gap:11px; width:100%; text-align:left; background:#fff; border:1.5px solid #E4EAE4; border-radius:12px; padding:11px 13px; cursor:pointer; transition:border-color .15s, background .15s";

  return {
    st,
    patch,
    patchFn,
    go,
    narrow,
    tiny,

    logout: () => { authLogout(); router.push("/tong-quan"); },

    // ---- shell ----
    sidebarStyle: narrow
      ? `position:fixed; top:0; left:0; bottom:0; width:266px; z-index:50; background:linear-gradient(175deg,#17452A 0%,#0E2A19 100%); padding:22px 14px; display:flex; flex-direction:column; transform:translateX(${st.navOpen ? "0" : "-105%"}); transition:transform .26s cubic-bezier(.4,0,.2,1); box-shadow:${st.navOpen ? "0 20px 50px -20px rgba(0,0,0,.5)" : "none"}`
      : "width:256px; flex-shrink:0; background:linear-gradient(175deg,#17452A 0%,#0E2A19 100%); padding:22px 14px; display:flex; flex-direction:column; position:sticky; top:0; height:100vh",
    navOverlay: narrow && st.navOpen,
    openNav: () => patch({ navOpen: true }),
    closeNav: () => patch({ navOpen: false }),
    closeNavStyle: narrow ? "border:none; background:#F1F4F1; border-radius:8px; width:28px; height:28px; cursor:pointer; color:#4A5A4E; font-size:12px" : "display:none",
    burgerStyle: narrow ? "border:1px solid #E1E7E1; background:#fff; border-radius:10px; width:40px; height:40px; cursor:pointer; font-size:15px; color:#3C4A40; flex-shrink:0" : "display:none",
    navItems: navDef.map((n) => {
      const on = active === n.key;
      return {
        label: n.label,
        icon: n.icon,
        badge: n.badge,
        go: () => go(n.key),
        style: `display:flex; align-items:center; gap:11px; width:100%; text-align:left; border:none; border-radius:11px; padding:11px 12px; font-size:14px; font-weight:${on ? "600" : "500"}; cursor:pointer; transition:background .15s, color .15s; background:${on ? "rgba(255,255,255,.14)" : "transparent"}; color:${on ? "#fff" : "rgba(255,255,255,.62)"}; box-shadow:${on ? "inset 0 0 0 1px rgba(255,255,255,.14)" : "none"}`,
        hoverStyle: on ? "" : "background:rgba(255,255,255,.07); color:#fff",
      };
    }),
    userName,
    userInitials,
    roleLabel: isAdmin ? "Quản trị viên" : "NV Kinh doanh",
    pageTitle: (titles[page] || titles.dash)[0],
    pageSub: (titles[page] || titles.dash)[1],
    todayLabel: "Thứ Năm, 06/08/2026",
    titleSize: tiny ? "19px" : "23px",
    topbarPad: tiny ? "14px 16px" : "18px 26px",
    contentPad: tiny ? "16px" : "22px 26px 40px",
    cardPad: tiny ? "18px" : "24px",
    dashCols: narrow ? "1fr" : "minmax(0,1.55fr) minmax(0,1fr)",
    detailCols: narrow ? "1fr" : "minmax(0,1.5fr) minmax(0,1fr)",
    colDisplay: st.w < 760 ? "none" : "block",
    newBtnStyle:
      tiny || ["channels", "logs", "send", "products"].includes(page) || (page === "tpl" && !st.tplQuoteId)
        ? "display:none"
        : "height:40px; padding:0 16px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:13.5px; font-weight:600; cursor:pointer; white-space:nowrap; box-shadow:0 8px 18px -9px rgba(31,116,64,.8)",
    newBtnLabel: page === "team" ? "+ Thêm người dùng" : page === "customers" ? "+ Thêm khách hàng" : page === "tpl" ? "+ Template mới" : "+ Báo giá mới",
    goNewQuote: () =>
      page === "team"
        ? patch({ uOpen: true, uForm: { id: "", name: "", email: "", dept: "", role: "Nhân viên" } })
        : page === "customers"
          ? patch({ cOpen: true, cForm: { id: "", name: "", market: "", tags: "" } })
          : page === "tpl"
            ? patch({ tplOpen: true, tplForm: { id: "", qid: st.tplQuoteId, name: "", icon: "📄", content: "" } })
            : go("new"),
    goQuotes: () => go("quotes"),

    // ---- page flags ----
    isDash: page === "dash",
    isQuotes: page === "quotes",
    isDetail: page === "detail",
    isTemplate: page === "template",
    isCustomers: page === "customers",
    isTeam: page === "team",
    isNew: page === "new",
    isChannels: page === "channels",
    isLogs: page === "logs",
    isSend: page === "send",
    isTpl: page === "tpl" && !st.tplQuoteId,
    isTplDetail: page === "tpl" && !!st.tplQuoteId,

    // ---- template screen ----
    current: cur,
    ownerInitials: initials(q.owner),
    createdDate: "04/08/2026",
    usedTemplates: [
      { key: "std", name: "Chuẩn quốc tế", icon: "🌐", tint: "#EAF3EC", info: `Gửi hôm qua, 16:40 · bởi ${q.owner}`, chan: "W", chanColor: "#25D366" },
      { key: "short", name: "Ngắn gọn", icon: "⚡", tint: "#FDF3E0", info: `Gửi 04/08/2026, 09:30 · bởi ${q.owner}`, chan: "Z", chanColor: "#0068FF" },
    ].map((u) => ({ ...u, open: () => patch({ page: "detail", templateKey: u.key }) })),
    templates: [
      { key: "std", name: "Chuẩn quốc tế", icon: "🌐", tint: "#EAF3EC", desc: "Đầy đủ Incoterm, điều khoản thanh toán và hiệu lực — cho khách nước ngoài." },
      { key: "short", name: "Ngắn gọn", icon: "⚡", tint: "#FDF3E0", desc: "Chỉ mặt hàng, số lượng và giá — gửi nhanh qua chat." },
      { key: "full", name: "Chi tiết đầy đủ", icon: "📋", tint: "#EDF0FA", desc: "Kèm quy cách đóng gói, lịch giao và điều khoản bổ sung." },
    ].map((t) => ({
      ...t,
      pick: () => patch({ page: "detail", templateKey: t.key }),
      style: "display:flex; flex-direction:column; align-items:flex-start; text-align:left; background:#fff; border-width:1.5px; border-style:solid; border-color:#E4EAE4; border-radius:16px; padding:20px; cursor:pointer; transition:border-color .15s, box-shadow .15s, transform .15s",
    })),

    // ---- detail screen ----
    hasSent: !!st.sentMsg,
    sentMsg: st.sentMsg,
    detailFields: [
      { label: "Tiêu đề", value: q.title },
      { label: "Danh mục", value: q.cat },
      { label: "Mặt hàng", value: q.product },
      { label: "Số lượng", value: q.qty },
      { label: "Điều kiện", value: q.incoterm },
      { label: "Thanh toán", value: q.payment },
      { label: "Ngày phát hành", value: q.issued },
      { label: "Hiệu lực đến", value: q.valid },
      { label: "Dự kiến giao", value: q.ship },
      { label: "Tổng giá trị", value: q.value + " " + q.currency },
      { label: "Phụ trách", value: q.owner },
      { label: "Trạng thái", value: q.status },
    ],
    messageText:
      st.templateKey === "short"
        ? `${q.product} — ${q.qty}\nGiá: ${q.value} (${q.incoterm})\nHiệu lực đến ${q.valid}.\n${q.owner} — Ago Group`
        : st.templateKey === "full"
          ? `Kính gửi ${q.customer},\n\nAgo Group xin gửi báo giá ${q.code}:\n• Mặt hàng: ${q.product}\n• Số lượng: ${q.qty}\n• Đóng gói: thùng carton 10kg, pallet tiêu chuẩn xuất khẩu\n• Điều kiện: ${q.incoterm}\n• Thanh toán: ${q.payment}\n• Dự kiến giao: ${q.ship}\n• Tổng giá trị: ${q.value}\n• Hiệu lực đến: ${q.valid}\n\nGiá đã bao gồm kiểm dịch thực vật và chứng từ xuất khẩu.\nRất mong nhận phản hồi từ Quý công ty.\n${q.owner} — Ago Group`
          : `Kính gửi ${q.customer},\n\nAgo Group xin gửi báo giá ${q.code} cho ${q.product} — ${q.qty}, điều kiện ${q.incoterm}, tổng giá trị ${q.value}.\nThanh toán: ${q.payment}. Hiệu lực đến ${q.valid}.\n\nRất mong nhận phản hồi từ Quý công ty.\n${q.owner} — Ago Group`,
    sendChannels: [
      { name: "WhatsApp", short: "W", color: "#25D366", handle: "+84 90 123 4567", style: chanBtn, send: () => patch({ sentMsg: "Đã gửi báo giá qua WhatsApp lúc 09:42." }) },
      { name: "Zalo", short: "Z", color: "#0068FF", handle: "Ago Group OA", style: chanBtn, send: () => patch({ sentMsg: "Đã gửi báo giá qua Zalo lúc 09:42." }) },
      { name: "Telegram", short: "T", color: "#2AABEE", handle: "@agogroup_sales", style: chanBtn, send: () => patch({ sentMsg: "Đã gửi báo giá qua Telegram lúc 09:42." }) },
    ],
    timeline: [
      { text: "Khách mở báo giá", time: "Hôm nay, 08:15", dot: "#3EA85C" },
      { text: `Gửi qua WhatsApp bởi ${q.owner}`, time: "Hôm qua, 16:40", dot: "#3EA85C" },
      { text: "Duyệt giá bởi Trần Quốc Bảo", time: "04/08/2026, 11:20", dot: "#C6D3C9" },
      { text: "Tạo báo giá", time: "04/08/2026, 09:05", dot: "#C6D3C9" },
    ],

    // ---- dashboard ----
    stats: STATS,
    recentQuotes: QUOTES.slice(0, 5).map((x) => decorate(x)),
    dashChannels: DASH_CHANNELS,

    // ---- quotes list ----
    filters,
    filteredQuotes: QUOTES.filter((x) => st.filter === "Tất cả" || x.status === st.filter).map((x) => decorate(x)),

    // ---- tpl screens ----
    tplQuotes: QUOTES.map((x) => {
      const list = st.quoteTpls[x.id] || [];
      return {
        ...x,
        count: `${list.length} template`,
        preview: list.length ? list.map((t) => t.icon).join(" ") : "—",
        openTpl: () => patch({ tplQuoteId: x.id, tplMenu: "" }),
      };
    }),
    tplQuote: QUOTES.find((y) => y.id === st.tplQuoteId) || QUOTES[0],
    backToTplList: () => patch({ tplQuoteId: "", tplMenu: "" }),
    tplList: (st.quoteTpls[st.tplQuoteId] || []).map((t) => ({
      ...t,
      info: `Sửa ${t.updated} · bởi ${t.by} · đã gửi ${t.sends} lần`,
      snippet: t.content.split("\n").filter(Boolean).slice(0, 2).join(" ").slice(0, 90) + "…",
      menuOpen: st.tplMenu === t.id,
      toggleMenu: () => patchFn((s) => ({ tplMenu: s.tplMenu === t.id ? "" : t.id })),
      editTpl: () => patch({ tplMenu: "", tplOpen: true, tplForm: { id: t.id, qid: st.tplQuoteId, name: t.name, icon: t.icon, content: t.content } }),
      dupTpl: () =>
        patchFn((s) => {
          const list = s.quoteTpls[st.tplQuoteId] || [];
          return { tplMenu: "", quoteTpls: { ...s.quoteTpls, [st.tplQuoteId]: [...list, { ...t, id: "t" + Date.now(), name: t.name + " (bản sao)", updated: "Vừa xong", by: userName || "Bạn", sends: 0 }] } };
        }),
      delTpl: () => patchFn((s) => ({ tplMenu: "", quoteTpls: { ...s.quoteTpls, [st.tplQuoteId]: (s.quoteTpls[st.tplQuoteId] || []).filter((x) => x.id !== t.id) } })),
    })),
    tplEmpty: (st.quoteTpls[st.tplQuoteId] || []).length === 0,
    openNewTpl: () => patch({ tplOpen: true, tplForm: { id: "", qid: st.tplQuoteId, name: "", icon: "📄", content: "" } }),
    tplTitle: st.tplForm.id ? "Chỉnh sửa template" : "Template mới",
    onTplName: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ tplForm: { ...s.tplForm, name: e.target.value } })),
    onTplContent: (e: React.ChangeEvent<HTMLTextAreaElement>) => patchFn((s) => ({ tplForm: { ...s.tplForm, content: e.target.value } })),
    tplIcons: ["📄", "🌐", "⚡", "📋", "🔔", "💼"].map((ic) => ({
      icon: ic,
      pick: () => patchFn((s) => ({ tplForm: { ...s.tplForm, icon: ic } })),
      style: `width:40px; height:40px; border-radius:10px; font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .14s; border:1.5px solid ${st.tplForm.icon === ic ? "#3EA85C" : "#E4EAE4"}; background:${st.tplForm.icon === ic ? "#EAF3EC" : "#fff"}`,
    })),
    closeTpl: () => patch({ tplOpen: false }),
    saveTpl: () =>
      patchFn((s) => {
        const f = s.tplForm;
        if (!f.name || !f.content) return {};
        const list = s.quoteTpls[f.qid] || [];
        const next = f.id
          ? list.map((x) => (x.id === f.id ? { ...x, name: f.name, icon: f.icon, content: f.content, updated: "Vừa xong" } : x))
          : [...list, { id: "t" + Date.now(), name: f.name, icon: f.icon, content: f.content, updated: "Vừa xong", by: userName || "Bạn", sends: 0 }];
        return { quoteTpls: { ...s.quoteTpls, [f.qid]: next }, tplOpen: false };
      }),

    // ---- team / users ----
    hasPending: st.pending.length > 0,
    pendingCount: String(st.pending.length),
    approvedMsg: st.approvedMsg,
    hasApprovedMsg: !!st.approvedMsg,
    pendingList: st.pending.map((p) => ({
      ...p,
      initials: initials(p.name),
      approve: () => patchFn((s) => ({ pending: s.pending.filter((x) => x.id !== p.id), approvedMsg: `Đã duyệt tài khoản ${p.name}.` })),
      reject: () => patchFn((s) => ({ pending: s.pending.filter((x) => x.id !== p.id), approvedMsg: `Đã từ chối yêu cầu của ${p.name}.` })),
    })),
    team: st.members.map((m) => {
      const isAdm2 = m.role === "Admin";
      return {
        ...m,
        initials: initials(m.name),
        tint: isAdm2 ? "#DEF3E6" : "#EAF3EC",
        roleBg: isAdm2 ? "#1F7440" : "#F1F5F1",
        roleColor: isAdm2 ? "#fff" : "#4A5A4E",
        statusLabel: m.active ? "Hoạt động" : "Đã khóa",
        statusColor: m.active ? "#1F7440" : "#B3261E",
        statusBg: m.active ? "#E7F5EC" : "#FDECEC",
        rowOpacity: m.active ? "1" : ".55",
        menuOpen: st.memberMenu === m.id,
        toggleMenu: () => patchFn((s) => ({ memberMenu: s.memberMenu === m.id ? "" : m.id })),
        editUser: () => patch({ memberMenu: "", uOpen: true, uForm: { id: m.id, name: m.name, email: m.email, dept: m.dept, role: m.role } }),
        switchRole: () => patchFn((s) => ({ memberMenu: "", members: s.members.map((x) => (x.id === m.id ? { ...x, role: isAdm2 ? "Nhân viên" : "Admin" } : x)), approvedMsg: `Đã đổi quyền của ${m.name} thành ${isAdm2 ? "Nhân viên" : "Admin"}.` })),
        switchRoleLabel: isAdm2 ? "Chuyển thành Nhân viên" : "Cấp quyền Admin",
        toggleActive: () => patchFn((s) => ({ memberMenu: "", members: s.members.map((x) => (x.id === m.id ? { ...x, active: !x.active } : x)), approvedMsg: m.active ? `Đã khóa tài khoản ${m.name}.` : `Đã mở khóa tài khoản ${m.name}.` })),
        toggleActiveLabel: m.active ? "Khóa tài khoản" : "Mở khóa tài khoản",
        toggleActiveColor: m.active ? "#B3261E" : "#1F7440",
      };
    }),
    uTitle: st.uForm.id ? "Chỉnh sửa người dùng" : "Thêm người dùng",
    onUfName: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ uForm: { ...s.uForm, name: e.target.value } })),
    onUfEmail: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ uForm: { ...s.uForm, email: e.target.value } })),
    onUfDept: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ uForm: { ...s.uForm, dept: e.target.value } })),
    ufStaffStyle: tab(st.uForm.role !== "Admin"),
    ufAdminStyle: tab(st.uForm.role === "Admin"),
    ufPickStaff: () => patchFn((s) => ({ uForm: { ...s.uForm, role: "Nhân viên" } })),
    ufPickAdmin: () => patchFn((s) => ({ uForm: { ...s.uForm, role: "Admin" } })),
    closeUser: () => patch({ uOpen: false }),
    saveUser: () =>
      patchFn((s) => {
        const f = s.uForm;
        if (!f.name || !f.email) return {};
        const members = f.id
          ? s.members.map((x) => (x.id === f.id ? { ...x, name: f.name, email: f.email, dept: f.dept, role: f.role } : x))
          : [...s.members, { id: "m" + Date.now(), name: f.name, email: f.email, dept: f.dept, role: f.role, active: true }];
        return { members, uOpen: false, approvedMsg: f.id ? `Đã cập nhật ${f.name}.` : `Đã tạo tài khoản cho ${f.name}.` };
      }),

    // ---- channels ----
    channelCfgs: [
      { key: "wa", name: "WhatsApp Business", short: "W", color: "#25D366", desc: "Gửi báo giá qua WhatsApp Business API", account: "+84 90 123 4567", sent: "46 tin tuần này" },
      { key: "zalo", name: "Zalo Official Account", short: "Z", color: "#0068FF", desc: "Gửi qua Zalo OA — khách hàng trong nước", account: "Ago Group OA", sent: "31 tin tuần này" },
      { key: "tg", name: "Telegram Bot", short: "T", color: "#2AABEE", desc: "Gửi qua bot Telegram cho khách quốc tế", account: "@agogroup_sales_bot", sent: "17 tin tuần này" },
    ].map((c) => {
      const on = st.chanOn[c.key as keyof AgoState["chanOn"]];
      return {
        ...c,
        on,
        statusLabel: on ? "Đang hoạt động" : "Đã tắt",
        statusColor: on ? "#1F7440" : "#8B9A90",
        statusBg: on ? "#E7F5EC" : "#F1F4F1",
        toggleLabel: on ? "Tắt kênh" : "Bật kênh",
        toggle: () => patchFn((s) => ({ chanOn: { ...s.chanOn, [c.key]: !s.chanOn[c.key as keyof AgoState["chanOn"]] } })),
      };
    }),

    // ---- logs ----
    logs: LOGS,

    // ---- customers ----
    customers: st.custList.map((c) => ({
      ...c,
      initials: initials(c.name, true),
      edit: () => patch({ cOpen: true, cForm: { id: c.id, name: c.name, market: c.market, tags: c.tags.join(", ") } }),
    })),
    cTitle: st.cForm.id ? "Chỉnh sửa khách hàng" : "Thêm khách hàng",
    onCfName: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ cForm: { ...s.cForm, name: e.target.value } })),
    onCfMarket: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ cForm: { ...s.cForm, market: e.target.value } })),
    onCfTags: (e: React.ChangeEvent<HTMLInputElement>) => patchFn((s) => ({ cForm: { ...s.cForm, tags: e.target.value } })),
    closeCust: () => patch({ cOpen: false }),
    saveCust: () =>
      patchFn((s) => {
        const f = s.cForm;
        if (!f.name) return {};
        const tags = f.tags.split(",").map((x) => x.trim()).filter(Boolean);
        const custList = f.id
          ? s.custList.map((x) => (x.id === f.id ? { ...x, name: f.name, market: f.market, tags } : x))
          : [{ id: "c" + Date.now(), name: f.name, market: f.market, tags, quotes: 0, last: "Vừa tạo", phone: "—", email: "—" }, ...s.custList];
        return { custList, cOpen: false };
      }),

    // ---- new quote ----
    newFields: [
      { label: "Tiêu đề báo giá", placeholder: "VD: Thanh long ruột đỏ xuất Đức — Q3" },
      { label: "Khách hàng", placeholder: "Chọn hoặc nhập tên" },
      { label: "Danh mục", placeholder: "VD: Trái cây tươi" },
      { label: "Mặt hàng", placeholder: "VD: Thanh long ruột đỏ" },
      { label: "Số lượng", placeholder: "VD: 2 x 40ft RF" },
      { label: "Điều kiện giao hàng", placeholder: "VD: CIF Hamburg" },
      { label: "Tổng giá trị", placeholder: "VD: 48.200" },
      { label: "Tiền tệ", placeholder: "USD / EUR / VND" },
      { label: "Ngày phát hành", placeholder: "VD: 06/08/2026" },
      { label: "Hiệu lực đến", placeholder: "VD: 20/08/2026" },
    ],
  };
}

export type Ctx = ReturnType<typeof useAgo>;

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sx, HButton, SkeletonBar } from "@/components/common/ui";
import { getJSON } from "@/components/common/api";

type Activity = {
  id: string;
  actorName: string | null;
  action: string;
  target: string | null;
  result: string | null;
  createdAt: string;
};
type Reply = {
  id: string;
  fromPhone: string;
  fromName: string | null;
  channel: string;
  kind: string;
  type: string | null;
  text: string | null;
  receivedAt: string;
  customer: { name: string; company: string | null } | null;
};
type Stats = {
  counts: {
    customers: number;
    templates: number;
    channels: number;
    users: number;
  };
  customerActive: number;
  recentActivity: Activity[];
  batchStatus: { status: string; count: number }[];
  recentReplies: Reply[];
  replyStats: { last3d: number; customersReplied: number };
  quota: {
    qualityRating: string | null;
    tier: string | null;
    limit: number | null;
    safeLimit: number | null;
    used24h: number;
    remaining: number | null;
    limitUnknown: boolean;
    numberStatus: string | null;
    fetchedAt: string | null;
  } | null;
};

const card =
  "background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px";
const fmtDate = (s: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(s));

const statusColor = (s: string) => {
  const u = s.toUpperCase();
  if (["SENT", "SUCCESS"].includes(u)) return "#1F7440";
  if (["FAILED", "PARTIAL_FAILED", "CANCELLED"].includes(u)) return "#B3261E";
  return "#B7791F";
};

const QUALITY: Record<string, { label: string; icon: string; color: string }> = {
  GREEN: { label: "Tốt", icon: "🟢", color: "#1F7440" },
  YELLOW: { label: "Trung bình", icon: "🟡", color: "#B07208" },
  RED: { label: "Kém", icon: "🔴", color: "#B3261E" },
  NA: { label: "Chưa xác định", icon: "⚪", color: "#8B9A90" },
};
const fmtNum = (n: number | null) => (n == null ? "—" : n.toLocaleString("vi-VN"));
const fmtTime = (s: string | null) =>
  s ? new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(s)) : "—";

export default function DashboardScreen() {
  const router = useRouter();
  const [s, setS] = useState<Stats | null>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      setS(await getJSON<Stats>("/api/dashboard"));
    } catch (e) {
      setErr((e as Error).message);
    }
  }, []);
  useEffect(() => {
    (async () => {
      await load();
    })();
  }, [load]);

  const kpis = s
    ? [
        {
          label: "Khách hàng",
          icon: "◎",
          value: s.counts.customers,
          sub: `${s.customerActive} đang hoạt động`,
          to: "/khach-hang",
        },
        {
          label: "Template",
          icon: "◆",
          value: s.counts.templates,
          sub: "mẫu gửi",
          to: "/template",
        },
        {
          label: "Kênh gửi",
          icon: "⇄",
          value: s.counts.channels,
          sub: "WhatsApp/Zalo/Telegram",
          to: "/kenh-gui",
        },
        {
          label: "Người dùng",
          icon: "◔",
          value: s.counts.users,
          sub: "tài khoản",
          to: "/nguoi-dung",
        },
      ]
    : [];

  return (
    <div>
      {err && (
        <div
          style={sx(
            "background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6; border-radius:10px; padding:10px 14px; font-size:13px; margin-bottom:12px",
          )}
        >
          {err}
        </div>
      )}
      {!s && !err && (
        <div
          style={sx(
            "display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px",
          )}
        >
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={sx(card)}>
              <div style={sx("display:flex; align-items:center; gap:8px")}>
                <div className="ago-skeleton" style={sx("width:34px; height:34px; border-radius:10px; flex-shrink:0")} />
                <SkeletonBar w="60%" h="11px" />
              </div>
              <div style={sx("margin-top:14px")}>
                <SkeletonBar w="45%" h="26px" />
              </div>
              <div style={sx("margin-top:10px")}>
                <SkeletonBar w="70%" h="11px" />
              </div>
            </div>
          ))}
        </div>
      )}

      {s && (
        <>
          {/* Dải cảnh báo chất lượng số (Việc 2): vàng/đỏ -> cảnh báo ngay đầu màn */}
          {s.quota && (s.quota.qualityRating === "YELLOW" || s.quota.qualityRating === "RED") && (
            <div
              style={sx(
                `display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:10px; margin-bottom:12px; font-size:13px; ${
                  s.quota.qualityRating === "RED"
                    ? "background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6"
                    : "background:#FDF3E0; color:#B07208; border:1px solid #F0E0C0"
                }`,
              )}
            >
              <span style={sx("font-size:16px")}>{QUALITY[s.quota.qualityRating]?.icon}</span>
              <span>
                Chất lượng số đang ở mức <b>{QUALITY[s.quota.qualityRating]?.label}</b> — khách đang chặn/báo cáo tin nhắn nhiều.
                Cân nhắc tạm dừng chiến dịch lớn và rà lại nội dung mẫu.
              </span>
            </div>
          )}

          {/* Số WhatsApp không ở trạng thái CONNECTED = Meta đang hạn chế/khoá số. Không báo thì
              người dùng chỉ thấy tin lỗi hàng loạt mà không hiểu vì sao. */}
          {s.quota?.numberStatus && s.quota.numberStatus !== "CONNECTED" && (
            <div style={sx("display:flex; align-items:center; gap:10px; padding:11px 14px; border-radius:10px; margin-bottom:12px; font-size:13px; background:#FDECEC; color:#B3261E; border:1px solid #F3C9C6")}>
              <span style={sx("font-size:16px")}>⛔</span>
              <span>
                Số WhatsApp đang ở trạng thái <b>{s.quota.numberStatus}</b> (không phải CONNECTED) — Meta có thể đang hạn chế
                hoặc khoá số này. Kiểm tra WhatsApp Manager trước khi gửi tiếp.
              </span>
            </div>
          )}

          {/* KPI cards */}
          <div
            style={sx(
              "display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:14px",
            )}
          >
            {kpis.map((k) => (
              <div
                key={k.label}
                onClick={() => router.push(k.to)}
                style={sx(
                  card +
                    "; cursor:pointer; transition:border-color .15s, box-shadow .15s",
                )}
              >
                <div style={sx("display:flex; align-items:center; gap:8px")}>
                  <div
                    style={sx(
                      "width:34px; height:34px; border-radius:10px; background:#EAF3EC; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0",
                    )}
                  >
                    {k.icon}
                  </div>
                  <div
                    style={sx(
                      "font-size:12.5px; color:#7B8A80; font-weight:600",
                    )}
                  >
                    {k.label}
                  </div>
                </div>
                <div
                  style={sx(
                    "font-size:30px; font-weight:700; color:#14261A; letter-spacing:-0.03em; margin-top:12px; line-height:1",
                  )}
                >
                  {k.value.toLocaleString("vi-VN")}
                </div>
                <div
                  style={sx(
                    "font-size:12px; color:#8B9A90; margin-top:8px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
                  )}
                >
                  {k.sub}
                </div>
              </div>
            ))}
          </div>

          {/* Phản hồi khách gần đây — cho sếp xem nhanh ai đã trả lời gì */}
          <div style={sx(card + "; margin-top:14px")}>
            <div
              style={sx(
                "display:flex; align-items:baseline; gap:10px; margin-bottom:10px; flex-wrap:wrap",
              )}
            >
              <div style={sx("font-size:16px; font-weight:700; color:#14261A")}>
                💬 Phản hồi khách gần đây
              </div>
              <div style={sx("font-size:12.5px; color:#7B8A80")}>
                {s.replyStats.customersReplied} khách đã trả lời ·{" "}
                {s.replyStats.last3d} tin trong 3 ngày
              </div>
              <div style={sx("flex:1")} />
              <HButton
                s="border:none; background:none; color:#2F8F4E; font-size:13px; font-weight:600; cursor:pointer; padding:0"
                onClick={() => router.push("/phan-hoi")}
              >
                Hộp thư →
              </HButton>
            </div>
            {s.recentReplies.length === 0 && (
              <div style={sx("font-size:13px; color:#8B9A90; padding:8px 0")}>
                Chưa có phản hồi nào. Khách trả lời qua WhatsApp sẽ hiện ở đây
                (cần bật webhook).
              </div>
            )}
            <div style={sx("display:flex; flex-direction:column")}>
              {s.recentReplies.slice(0, 3).map((r) => (
                <div
                  key={r.id}
                  style={sx(
                    "display:flex; align-items:flex-start; gap:11px; padding:11px 0; border-top:1px solid #F2F5F2",
                  )}
                >
                  <div
                    style={sx(
                      "width:36px; height:36px; border-radius:50%; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700; flex-shrink:0",
                    )}
                  >
                    {(r.customer?.name || r.fromName || "?").trim().charAt(0).toUpperCase()}
                  </div>
                  <div style={sx("min-width:0; flex:1")}>
                    <div
                      style={sx(
                        "display:flex; align-items:baseline; gap:8px; flex-wrap:wrap",
                      )}
                    >
                      <span
                        style={sx(
                          "font-size:13.5px; color:#14261A; font-weight:700",
                        )}
                      >
                        {r.customer?.name || r.fromName || r.fromPhone}
                      </span>
                      {r.customer?.company && (
                        <span style={sx("font-size:12px; color:#7B8A80")}>
                          · {r.customer.company}
                        </span>
                      )}
                      {r.kind === "flow_response" && (
                        <span
                          style={sx(
                            "font-size:10.5px; font-weight:700; color:#1F7440; background:#E7F5EC; border-radius:5px; padding:1px 6px",
                          )}
                        >
                          Flow
                        </span>
                      )}
                    </div>
                    <div
                      style={sx(
                        "font-size:13px; color:#3C4A40; margin-top:2px; overflow:hidden; text-overflow:ellipsis; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical",
                      )}
                    >
                      {r.text || "—"}
                    </div>
                  </div>
                  <div
                    style={sx(
                      "font-size:11.5px; color:#9AA7A0; white-space:nowrap; flex-shrink:0",
                    )}
                  >
                    {fmtDate(r.receivedAt)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            className="ago-collapse"
            style={sx(
              "display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:14px; margin-top:14px",
            )}
          >
            {/* Trạng thái gửi */}
            <div style={sx(card)}>
              <div
                style={sx(
                  "font-size:16px; font-weight:700; color:#14261A; margin-bottom:12px",
                )}
              >
                Trạng thái gửi
              </div>
              {s.batchStatus.length === 0 && (
                <div style={sx("font-size:13px; color:#8B9A90")}>
                  Chưa có lệnh gửi nào.
                </div>
              )}
              <div style={sx("display:flex; flex-direction:column; gap:9px")}>
                {s.batchStatus.map((b) => (
                  <div
                    key={b.status}
                    style={sx(
                      "display:flex; align-items:center; gap:8px; font-size:13px",
                    )}
                  >
                    <span
                      style={sx(
                        `width:9px; height:9px; border-radius:50%; background:${statusColor(b.status)}`,
                      )}
                    />
                    <span style={sx("color:#3C4A40; font-weight:500")}>
                      {b.status}
                    </span>
                    <span style={sx("flex:1")} />
                    <span style={sx("font-weight:700; color:#14261A")}>
                      {b.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Hoạt động gần đây */}
            <div style={sx(card)}>
              <div
                style={sx(
                  "display:flex; align-items:baseline; gap:10px; margin-bottom:8px",
                )}
              >
                <div
                  style={sx("font-size:16px; font-weight:700; color:#14261A")}
                >
                  Hoạt động gần đây
                </div>
                <div style={sx("flex:1")} />
                <HButton
                  s="border:none; background:none; color:#2F8F4E; font-size:13px; font-weight:600; cursor:pointer; padding:0"
                  onClick={() => router.push("/nhat-ky")}
                >
                  Nhật ký →
                </HButton>
              </div>
              {s.recentActivity.length === 0 && (
                <div style={sx("font-size:13px; color:#8B9A90; padding:6px 0")}>
                  Chưa có hoạt động.
                </div>
              )}
              <div style={sx("display:flex; flex-direction:column")}>
                {s.recentActivity.map((a) => (
                  <div
                    key={a.id}
                    style={sx(
                      "display:flex; align-items:flex-start; gap:9px; padding:8px 0; border-top:1px solid #F2F5F2",
                    )}
                  >
                    <span
                      style={sx(
                        `width:8px; height:8px; border-radius:50%; margin-top:5px; flex-shrink:0; background:${statusColor(a.result || "")}`,
                      )}
                    />
                    <div style={sx("min-width:0; flex:1")}>
                      <div
                        style={sx(
                          "font-size:12.5px; color:#14261A; font-weight:600",
                        )}
                      >
                        {a.action}
                        {a.target ? ` · ${a.target}` : ""}
                      </div>
                      <div style={sx("font-size:11.5px; color:#8B9A90")}>
                        {a.actorName || "Hệ thống"} · {fmtDate(a.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chất lượng số & hạn mức (Việc 2) */}
            <div style={sx(card)}>
              <div style={sx("font-size:16px; font-weight:700; color:#14261A; margin-bottom:12px")}>
                Chất lượng số & hạn mức
              </div>
              {!s.quota ? (
                <div style={sx("font-size:13px; color:#8B9A90")}>
                  Chưa có dữ liệu — thiếu số WhatsApp (WHATSAPP_PHONE_NUMBER_ID) hoặc Meta chưa phản hồi.
                </div>
              ) : (
                <div style={sx("display:flex; flex-direction:column; gap:9px")}>
                  <div style={sx("display:flex; align-items:center; gap:9px")}>
                    <span style={sx("font-size:24px")}>{QUALITY[s.quota.qualityRating || "NA"]?.icon ?? "⚪"}</span>
                    <div style={sx("min-width:0")}>
                      <div style={sx(`font-size:14px; font-weight:700; color:${QUALITY[s.quota.qualityRating || "NA"]?.color ?? "#8B9A90"}`)}>
                        Chất lượng: {QUALITY[s.quota.qualityRating || "NA"]?.label ?? "—"}
                      </div>
                      <div style={sx("font-size:12px; color:#8B9A90")}>
                        {s.quota.limitUnknown ? "Hạn mức không xác định — giả định 2.000" : s.quota.tier || ""}
                      </div>
                    </div>
                  </div>
                  <div style={sx("display:flex; justify-content:space-between; gap:10px; font-size:13px; color:#3C4A40; padding-top:10px; border-top:1px solid #F2F5F2")}>
                    <span>
                      Hạn mức: <b>{s.quota.limitUnknown ? `~${fmtNum(s.quota.limit)}` : fmtNum(s.quota.limit)}</b> khách/24h
                    </span>
                    <span>Đã dùng 24h: <b>{fmtNum(s.quota.used24h)}</b></span>
                  </div>
                  <div style={sx("font-size:12.5px; color:#8B9A90")}>
                    Còn an toàn: {fmtNum(s.quota.remaining)}
                    {s.quota.limit != null && s.quota.limit > 0
                      ? ` · ${Math.min(100, Math.round((s.quota.used24h / s.quota.limit) * 100))}% đã dùng`
                      : ""}
                  </div>
                  {/* Hạn mức là số app TỰ ĐOÁN khi Meta không trả tier — phải nói ra, không để
                      người dùng tưởng đây là con số Meta xác nhận. */}
                  {s.quota.limitUnknown && (
                    <div style={sx("font-size:12px; color:#B07208; background:#FDF8EC; border:1px solid #F0E0C0; border-radius:8px; padding:7px 10px")}>
                      ⚠️ Meta không trả về hạn mức của số này — con số trên là <b>mức giả định</b> của hệ thống, không phải
                      hạn mức Meta xác nhận. Hệ thống vẫn chặn gửi vượt theo mức giả định đó.
                    </div>
                  )}
                  <div style={sx("font-size:11.5px; color:#9AA7A0")}>
                    Số {s.quota.numberStatus === "CONNECTED" ? "đang hoạt động" : s.quota.numberStatus || "—"} · đọc từ Meta lúc{" "}
                    {fmtTime(s.quota.fetchedAt)} (làm mới mỗi 10 phút) · &ldquo;Đã dùng&rdquo; chỉ tính tin do app này gửi
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

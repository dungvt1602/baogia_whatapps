"use client";

import type { Ctx } from "@/components/layout/useAgo";
import { sx, HButton } from "@/components/common/ui";

export function Customers({ v }: { v: Ctx }) {
  return (
    <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(260px,1fr)); gap:14px")}>
      {v.customers.map((c) => (
        <div key={c.id} style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px")}>
          <div style={sx("display:flex; align-items:center; gap:11px")}>
            <div style={sx("width:40px; height:40px; border-radius:12px; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:15px")}>{c.initials}</div>
            <div style={sx("min-width:0; flex:1")}>
              <div style={sx("font-size:14.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{c.name}</div>
              <div style={sx("font-size:12.5px; color:#8B9A90")}>{c.market}</div>
            </div>
            <HButton title="Chỉnh sửa" s="width:32px; height:32px; border:1px solid #E1E7E1; border-radius:9px; background:#fff; cursor:pointer; color:#4A5A4E; font-size:13px; flex-shrink:0" h="background:#F5F8F5" onClick={c.edit}>✎</HButton>
          </div>
          <div style={sx("display:flex; gap:6px; margin-top:14px; flex-wrap:wrap")}>
            {c.tags.map((t, i) => (
              <span key={i} style={sx("background:#F1F5F1; color:#4A5A4E; font-size:11.5px; font-weight:600; padding:4px 9px; border-radius:20px")}>{t}</span>
            ))}
          </div>
          <div style={sx("display:flex; flex-direction:column; gap:5px; margin-top:14px; font-size:12.5px; color:#5A6A5E")}>
            <span>✆ {c.phone}</span>
            <span style={sx("white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>✉ {c.email}</span>
          </div>
          <div style={sx("display:flex; align-items:baseline; gap:6px; margin-top:12px; padding-top:12px; border-top:1px solid #F0F3F0; font-size:13px; color:#7B8A80")}>
            <span>{c.quotes} báo giá</span><span>·</span><span>{c.last}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export function Team({ v }: { v: Ctx }) {
  return (
    <>
      {v.hasApprovedMsg && <div style={sx("background:#E7F5EC; color:#1B5E33; border:1px solid #CBE9D6; border-radius:12px; padding:12px 16px; font-size:13.5px; font-weight:600; margin-bottom:14px")}>{v.approvedMsg}</div>}
      {v.hasPending && (
        <div style={sx("background:#fff; border:1.5px solid #F0D9A8; border-radius:16px; overflow:hidden; margin-bottom:14px")}>
          <div style={sx("display:flex; align-items:center; gap:10px; padding:14px 18px; background:#FDF6E5; border-bottom:1px solid #F0E4C4")}>
            <span style={sx("font-size:14.5px; font-weight:700; color:#7A5A10")}>Chờ duyệt tài khoản</span>
            <span style={sx("background:#F5A623; color:#fff; font-size:11.5px; font-weight:700; border-radius:20px; padding:2px 9px")}>{v.pendingCount}</span>
          </div>
          {v.pendingList.map((p) => (
            <div key={p.id} style={sx("display:flex; align-items:center; gap:14px; padding:14px 18px; border-bottom:1px solid #F5F1E4; flex-wrap:wrap")}>
              <div style={sx("width:40px; height:40px; border-radius:50%; background:#FDF3E0; color:#B07208; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0")}>{p.initials}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:14.5px; font-weight:600; color:#14261A")}>{p.name}</div>
                <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{p.email} · {p.dept} · {p.time}</div>
              </div>
              <div style={sx("display:flex; gap:8px")}>
                <HButton s="height:36px; padding:0 16px; border:none; border-radius:9px; background:#1F7440; color:#fff; font-size:13px; font-weight:600; cursor:pointer" h="background:#17612F" onClick={p.approve}>Duyệt</HButton>
                <HButton s="height:36px; padding:0 14px; border:1px solid #E4C7C5; border-radius:9px; background:#fff; color:#B3261E; font-size:13px; font-weight:600; cursor:pointer" h="background:#FDF3F2" onClick={p.reject}>Từ chối</HButton>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; overflow:visible")}>
        {v.team.map((m) => (
          <div key={m.id} style={sx(`display:flex; align-items:center; gap:14px; padding:15px 18px; border-bottom:1px solid #F0F3F0; position:relative; opacity:${m.rowOpacity}`)}>
            <div style={sx(`width:40px; height:40px; border-radius:50%; background:${m.tint}; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; flex-shrink:0`)}>{m.initials}</div>
            <div style={sx("min-width:0; flex:1")}>
              <div style={sx("font-size:14.5px; font-weight:600; color:#14261A")}>{m.name}</div>
              <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{m.email}</div>
            </div>
            <div style={sx(`display:${v.colDisplay}; font-size:13px; color:#7B8A80; width:130px`)}>{m.dept}</div>
            <div style={sx(`background:${m.statusBg}; color:${m.statusColor}; font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:20px; white-space:nowrap`)}>{m.statusLabel}</div>
            <div style={sx(`background:${m.roleBg}; color:${m.roleColor}; font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:20px; white-space:nowrap`)}>{m.role}</div>
            <HButton s="width:34px; height:34px; border:1px solid #E1E7E1; border-radius:9px; background:#fff; cursor:pointer; color:#4A5A4E; font-size:16px; line-height:1; flex-shrink:0" h="background:#F5F8F5" onClick={m.toggleMenu}>⋯</HButton>
            {m.menuOpen && (
              <div style={sx("position:absolute; right:18px; top:58px; z-index:30; background:#fff; border:1px solid #E4EAE4; border-radius:13px; box-shadow:0 18px 40px -14px rgba(20,38,26,.3); padding:6px; min-width:210px; display:flex; flex-direction:column; gap:2px")}>
                <HButton s="display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:10px 12px; font-size:13.5px; font-weight:500; color:#14261A; cursor:pointer" h="background:#F5F8F5" onClick={m.editUser}>Chỉnh sửa thông tin</HButton>
                <HButton s="display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:10px 12px; font-size:13.5px; font-weight:500; color:#14261A; cursor:pointer" h="background:#F5F8F5" onClick={m.switchRole}>{m.switchRoleLabel}</HButton>
                <HButton s={`display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:10px 12px; font-size:13.5px; font-weight:500; color:${m.toggleActiveColor}; cursor:pointer`} h="background:#F5F8F5" onClick={m.toggleActive}>{m.toggleActiveLabel}</HButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

export function Channels({ v }: { v: Ctx }) {
  return (
    <>
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:14px")}>
        {v.channelCfgs.map((c) => (
          <div key={c.key} style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:20px; display:flex; flex-direction:column; gap:14px")}>
            <div style={sx("display:flex; align-items:center; gap:12px")}>
              <span style={sx(`width:42px; height:42px; border-radius:12px; background:${c.color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:18px; font-weight:700`)}>{c.short}</span>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:15px; font-weight:700; color:#14261A")}>{c.name}</div>
                <div style={sx("font-size:12.5px; color:#8B9A90")}>{c.account}</div>
              </div>
              <span style={sx(`background:${c.statusBg}; color:${c.statusColor}; font-size:11.5px; font-weight:700; padding:5px 11px; border-radius:20px; white-space:nowrap`)}>{c.statusLabel}</span>
            </div>
            <div style={sx("font-size:13.5px; color:#5A6A5E; line-height:1.6")}>{c.desc}</div>
            <div style={sx("display:flex; align-items:center; gap:10px; margin-top:auto")}>
              <span style={sx("font-size:12.5px; color:#8B9A90; flex:1")}>{c.sent}</span>
              <HButton s="height:36px; padding:0 16px; border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#4A5A4E; font-size:13px; font-weight:600; cursor:pointer" h="background:#F7FAF7" onClick={c.toggle}>{c.toggleLabel}</HButton>
            </div>
          </div>
        ))}
      </div>
      <div style={sx("background:linear-gradient(150deg,#1F7440,#123E24); border-radius:16px; padding:20px 22px; color:#fff; margin-top:14px; display:flex; align-items:center; gap:16px; flex-wrap:wrap")}>
        <div style={sx("flex:1; min-width:240px")}>
          <div style={sx("font-size:15px; font-weight:700")}>Mẫu tin nhắn báo giá</div>
          <div style={sx("font-size:13px; color:#A9C7B4; margin-top:4px; line-height:1.6")}>Nội dung gửi tự động sẽ dùng chung một mẫu cho cả ba kênh.</div>
        </div>
        <HButton s="height:40px; padding:0 18px; border:none; border-radius:10px; background:#fff; color:#1B5E33; font-size:13.5px; font-weight:600; cursor:pointer">Chỉnh sửa mẫu</HButton>
      </div>
    </>
  );
}

export function Logs({ v }: { v: Ctx }) {
  return (
    <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; overflow:hidden")}>
      {v.logs.map((l, i) => (
        <div key={i} style={sx("display:flex; align-items:center; gap:14px; padding:13px 18px; border-bottom:1px solid #F0F3F0")}>
          <span style={sx(`width:9px; height:9px; border-radius:50%; background:${l.dot}; flex-shrink:0`)} />
          <div style={sx("min-width:0; flex:1")}>
            <div style={sx("font-size:14px; color:#14261A")}><span style={sx("font-weight:600")}>{l.who}</span> — {l.act}</div>
          </div>
          <span style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap")}>{l.time}</span>
        </div>
      ))}
    </div>
  );
}

export function Tpl({ v }: { v: Ctx }) {
  return (
    <>
      <div style={sx("font-size:13.5px; color:#7B8A80; margin-bottom:14px")}>Chọn báo giá để xem và quản lý các template thuộc về nó.</div>
      <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; overflow:hidden; max-width:900px")}>
        {v.tplQuotes.map((q) => (
          <HButton key={q.id} s="display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid #F0F3F0; padding:15px 18px; cursor:pointer; transition:background .14s" h="background:#F7FAF7" onClick={q.openTpl}>
            <div style={sx(`width:40px; height:40px; border-radius:11px; background:${q.tint}; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0`)}>{q.icon}</div>
            <div style={sx("min-width:0; flex:1")}>
              <div style={sx("font-size:14.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title}</div>
              <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.code} · {q.customer}</div>
            </div>
            <div style={sx(`display:${v.colDisplay}; font-size:15px; letter-spacing:4px`)}>{q.preview}</div>
            <span style={sx("background:#F1F5F1; color:#4A5A4E; font-size:12px; font-weight:700; border-radius:20px; padding:5px 12px; white-space:nowrap")}>{q.count}</span>
            <span style={sx("color:#B9C5BC; font-size:15px")}>›</span>
          </HButton>
        ))}
      </div>
    </>
  );
}

export function TplDetail({ v }: { v: Ctx }) {
  const q = v.tplQuote;
  return (
    <>
      <HButton s="display:inline-flex; align-items:center; gap:7px; border:none; background:none; color:#2F8F4E; font-size:13.5px; font-weight:600; cursor:pointer; padding:0; margin-bottom:14px" onClick={v.backToTplList}>‹ Tất cả báo giá</HButton>
      <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px 20px; max-width:900px; margin-bottom:14px; display:flex; align-items:center; gap:13px")}>
        <div style={sx(`width:44px; height:44px; border-radius:12px; background:${q.tint}; display:flex; align-items:center; justify-content:center; font-size:20px`)}>{q.icon}</div>
        <div style={sx("min-width:0; flex:1")}>
          <div style={sx("font-size:16.5px; font-weight:700; color:#14261A")}>{q.title}</div>
          <div style={sx("font-size:13px; color:#8B9A90")}>{q.code} · {q.customer} · phụ trách {q.owner}</div>
        </div>
      </div>

      {v.tplEmpty && (
        <div style={sx("background:#fff; border:1.5px dashed #D5DED6; border-radius:16px; padding:40px 24px; max-width:900px; text-align:center")}>
          <div style={sx("font-size:15px; font-weight:600; color:#4A5A4E")}>Báo giá này chưa có template nào</div>
          <div style={sx("font-size:13.5px; color:#8B9A90; margin-top:6px")}>Tạo template đầu tiên để gửi khách qua WhatsApp, Zalo hoặc Telegram.</div>
          <HButton s="margin-top:18px; height:42px; padding:0 20px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14px; font-weight:600; cursor:pointer; box-shadow:0 8px 18px -8px rgba(31,116,64,.7)" onClick={v.openNewTpl}>+ Template mới</HButton>
        </div>
      )}

      <div style={sx("display:grid; grid-template-columns:repeat(auto-fill, minmax(300px,1fr)); gap:14px; max-width:900px")}>
        {v.tplList.map((t) => (
          <div key={t.id} style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px; position:relative; display:flex; flex-direction:column; gap:12px")}>
            <div style={sx("display:flex; align-items:center; gap:11px")}>
              <div style={sx("width:38px; height:38px; border-radius:11px; background:#F1F5F1; display:flex; align-items:center; justify-content:center; font-size:17px")}>{t.icon}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:14.5px; font-weight:700; color:#14261A")}>{t.name}</div>
                <div style={sx("font-size:11.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{t.info}</div>
              </div>
              <HButton s="width:30px; height:30px; border:1px solid #E1E7E1; border-radius:8px; background:#fff; cursor:pointer; color:#4A5A4E; font-size:14px; line-height:1; flex-shrink:0" h="background:#F5F8F5" onClick={t.toggleMenu}>⋯</HButton>
            </div>
            <div style={sx("background:#F6F9F6; border:1px solid #EDF1ED; border-radius:11px; padding:12px 13px; font-size:12.5px; line-height:1.65; color:#5A6A5E; flex:1")}>{t.snippet}</div>
            <HButton s="align-self:flex-start; height:34px; padding:0 15px; border:1px solid #DCE3DC; border-radius:9px; background:#fff; color:#1F7440; font-size:12.5px; font-weight:600; cursor:pointer" h="background:#F0F7F1" onClick={t.editTpl}>Sửa nội dung</HButton>
            {t.menuOpen && (
              <div style={sx("position:absolute; right:16px; top:52px; z-index:30; background:#fff; border:1px solid #E4EAE4; border-radius:13px; box-shadow:0 18px 40px -14px rgba(20,38,26,.3); padding:6px; min-width:180px; display:flex; flex-direction:column; gap:2px")}>
                <HButton s="display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:500; color:#14261A; cursor:pointer" h="background:#F5F8F5" onClick={t.editTpl}>Chỉnh sửa</HButton>
                <HButton s="display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:500; color:#14261A; cursor:pointer" h="background:#F5F8F5" onClick={t.dupTpl}>Nhân bản</HButton>
                <HButton s="display:block; width:100%; text-align:left; border:none; background:none; border-radius:8px; padding:9px 12px; font-size:13px; font-weight:500; color:#B3261E; cursor:pointer" h="background:#FDF3F2" onClick={t.delTpl}>Xóa</HButton>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

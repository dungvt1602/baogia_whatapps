"use client";

import type { Ctx } from "./useAgo";
import { sx, HButton, HInput } from "./ui";

export function Dash({ v }: { v: Ctx }) {
  return (
    <>
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(190px, 1fr)); gap:14px")}>
        {v.stats.map((s, i) => (
          <div key={i} style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:18px 18px 16px")}>
            <div style={sx("font-size:12.5px; color:#7B8A80; font-weight:500")}>{s.label}</div>
            <div style={sx("font-size:30px; font-weight:700; color:#14261A; letter-spacing:-0.03em; margin-top:8px; line-height:1")}>{s.value}</div>
            <div style={sx(`font-size:12.5px; color:${s.color}; margin-top:8px; font-weight:500`)}>{s.delta}</div>
          </div>
        ))}
      </div>

      <div style={sx(`display:grid; grid-template-columns:${v.dashCols}; gap:14px; margin-top:14px`)}>
        <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:20px")}>
          <div style={sx("display:flex; align-items:baseline; gap:10px")}>
            <div style={sx("font-size:16px; font-weight:700; color:#14261A")}>Báo giá gần đây</div>
            <div style={sx("flex:1")} />
            <HButton s="border:none; background:none; color:#2F8F4E; font-size:13px; font-weight:600; cursor:pointer; padding:0" onClick={v.goQuotes}>Xem tất cả →</HButton>
          </div>
          <div style={sx("display:flex; flex-direction:column; gap:2px; margin-top:14px")}>
            {v.recentQuotes.map((q) => (
              <HButton key={q.id} s="display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:none; border:none; border-radius:11px; padding:11px 10px; cursor:pointer; transition:background .14s" h="background:#F5F8F5" onClick={q.open}>
                <div style={sx(`width:36px; height:36px; border-radius:10px; background:${q.tint}; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0`)}>{q.icon}</div>
                <div style={sx("min-width:0; flex:1")}>
                  <div style={sx("font-size:14px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.customer}</div>
                  <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.code} · {q.product}</div>
                </div>
                <div style={sx("text-align:right; flex-shrink:0")}>
                  <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{q.value}</div>
                  <div style={sx(`font-size:11.5px; color:${q.statusColor}; font-weight:600`)}>{q.status}</div>
                </div>
              </HButton>
            ))}
          </div>
        </div>

        <div style={sx("display:flex; flex-direction:column; gap:14px")}>
          <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:20px")}>
            <div style={sx("font-size:16px; font-weight:700; color:#14261A")}>Kênh gửi tuần này</div>
            <div style={sx("display:flex; flex-direction:column; gap:14px; margin-top:16px")}>
              {v.dashChannels.map((c) => (
                <div key={c.name}>
                  <div style={sx("display:flex; align-items:center; gap:8px; font-size:13.5px; color:#3C4A40; font-weight:500")}>
                    <span style={sx(`width:9px; height:9px; border-radius:50%; background:${c.color}`)} />
                    <span>{c.name}</span>
                    <span style={sx("flex:1")} />
                    <span style={sx("font-weight:700; color:#14261A")}>{c.count}</span>
                  </div>
                  <div style={sx("height:7px; border-radius:6px; background:#EEF2EE; margin-top:8px; overflow:hidden")}>
                    <div style={sx(`height:100%; border-radius:6px; background:${c.color}; width:${c.pct}`)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={sx("background:linear-gradient(150deg,#1F7440,#123E24); border-radius:16px; padding:20px; color:#fff")}>
            <div style={sx("font-size:13px; color:#9BD1AE; font-weight:600; letter-spacing:.1em; text-transform:uppercase")}>Nhắc việc</div>
            <div style={sx("font-size:16px; font-weight:600; margin-top:10px; line-height:1.5; text-wrap:pretty")}>3 báo giá quá 5 ngày chưa có phản hồi từ khách.</div>
            <HButton s="margin-top:14px; height:38px; padding:0 16px; border:none; border-radius:10px; background:#fff; color:#1B5E33; font-size:13.5px; font-weight:600; cursor:pointer" onClick={v.goQuotes}>Theo dõi ngay</HButton>
          </div>
        </div>
      </div>
    </>
  );
}

export function Quotes({ v }: { v: Ctx }) {
  return (
    <>
      <div style={sx("display:flex; flex-wrap:wrap; gap:8px; margin-bottom:14px")}>
        {v.filters.map((f) => (
          <HButton key={f.label} s={f.style} onClick={f.pick}>{f.label}</HButton>
        ))}
      </div>
      <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; overflow:hidden")}>
        {v.filteredQuotes.map((q) => (
          <HButton key={q.id} s="display:flex; align-items:center; gap:14px; width:100%; text-align:left; background:none; border:none; border-bottom:1px solid #F0F3F0; padding:15px 18px; cursor:pointer; transition:background .14s" h="background:#F7FAF7" onClick={q.open}>
            <div style={sx(`width:40px; height:40px; border-radius:11px; background:${q.tint}; display:flex; align-items:center; justify-content:center; font-size:18px; flex-shrink:0`)}>{q.icon}</div>
            <div style={sx("min-width:0; flex:1")}>
              <div style={sx("font-size:14.5px; font-weight:600; color:#14261A; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.title}</div>
              <div style={sx("font-size:12.5px; color:#8B9A90; white-space:nowrap; overflow:hidden; text-overflow:ellipsis")}>{q.code} · {q.customer} · {q.cat}</div>
            </div>
            <div style={sx(`display:${v.colDisplay}; font-size:13px; color:#7B8A80; width:120px; flex-shrink:0`)}>{q.owner}</div>
            <div style={sx("text-align:right; flex-shrink:0")}>
              <div style={sx(`font-size:11.5px; color:${q.statusColor}; font-weight:600`)}>{q.status}</div>
            </div>
          </HButton>
        ))}
      </div>
    </>
  );
}

export function Template({ v }: { v: Ctx }) {
  const c = v.current;
  return (
    <>
      <div style={sx(`background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:${v.cardPad}; max-width:900px; margin-bottom:14px`)}>
        <div style={sx("display:flex; align-items:center; gap:12px")}>
          <div style={sx(`width:46px; height:46px; border-radius:13px; background:${c.tint}; display:flex; align-items:center; justify-content:center; font-size:22px`)}>{c.icon}</div>
          <div style={sx("min-width:0; flex:1")}>
            <div style={sx("font-size:18px; font-weight:700; color:#14261A; letter-spacing:-0.01em")}>{c.title}</div>
            <div style={sx("font-size:13px; color:#8B9A90")}>{c.code} · {c.customer}</div>
          </div>
          <div style={sx(`background:${c.statusBg}; color:${c.statusColor}; font-size:12px; font-weight:700; padding:6px 12px; border-radius:20px; white-space:nowrap`)}>{c.status}</div>
        </div>
        <div style={sx("height:1px; background:#EDF1ED; margin:18px 0")} />
        <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(150px,1fr)); gap:16px")}>
          <div>
            <div style={sx("font-size:12px; color:#8B9A90; font-weight:500")}>Người tạo</div>
            <div style={sx("display:flex; align-items:center; gap:8px; margin-top:6px")}>
              <div style={sx("width:26px; height:26px; border-radius:50%; background:#EAF3EC; color:#1F7440; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:11px")}>{v.ownerInitials}</div>
              <span style={sx("font-size:14.5px; color:#14261A; font-weight:600")}>{c.owner}</span>
            </div>
          </div>
          <div>
            <div style={sx("font-size:12px; color:#8B9A90; font-weight:500")}>Ngày tạo</div>
            <div style={sx("font-size:14.5px; color:#14261A; font-weight:600; margin-top:7px")}>{v.createdDate}</div>
          </div>
          <div>
            <div style={sx("font-size:12px; color:#8B9A90; font-weight:500")}>Hiệu lực đến</div>
            <div style={sx("font-size:14.5px; color:#14261A; font-weight:600; margin-top:7px")}>{c.valid}</div>
          </div>
        </div>
      </div>

      <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; overflow:hidden; max-width:900px; margin-bottom:20px")}>
        <div style={sx("padding:16px 20px 0; font-size:15px; font-weight:700; color:#14261A")}>Template đã sử dụng</div>
        <div style={sx("padding:8px 8px 10px")}>
          {v.usedTemplates.map((u) => (
            <HButton key={u.key} s="display:flex; align-items:center; gap:12px; width:100%; text-align:left; background:none; border:none; border-radius:11px; padding:11px 12px; cursor:pointer; transition:background .14s" h="background:#F5F8F5" onClick={u.open}>
              <div style={sx(`width:36px; height:36px; border-radius:10px; background:${u.tint}; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0`)}>{u.icon}</div>
              <div style={sx("min-width:0; flex:1")}>
                <div style={sx("font-size:14px; font-weight:600; color:#14261A")}>{u.name}</div>
                <div style={sx("font-size:12.5px; color:#8B9A90")}>{u.info}</div>
              </div>
              <span style={sx(`width:26px; height:26px; border-radius:8px; background:${u.chanColor}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; flex-shrink:0`)}>{u.chan}</span>
              <span style={sx("color:#B9C5BC; font-size:14px")}>›</span>
            </HButton>
          ))}
        </div>
      </div>

      <div style={sx("font-size:14px; font-weight:700; color:#14261A; margin-bottom:12px; max-width:900px")}>Hoặc chọn mẫu mới</div>
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(240px,1fr)); gap:14px; max-width:900px")}>
        {v.templates.map((t) => (
          <HButton key={t.key} s={t.style} h="border-color:#3EA85C; box-shadow:0 14px 30px -16px rgba(31,116,64,.4); transform:translateY(-2px)" onClick={t.pick}>
            <div style={sx(`width:44px; height:44px; border-radius:12px; background:${t.tint}; display:flex; align-items:center; justify-content:center; font-size:20px`)}>{t.icon}</div>
            <div style={sx("font-size:15.5px; font-weight:700; color:#14261A; margin-top:14px")}>{t.name}</div>
            <div style={sx("font-size:13px; color:#7B8A80; line-height:1.6; margin-top:6px")}>{t.desc}</div>
          </HButton>
        ))}
      </div>
    </>
  );
}

export function Detail({ v }: { v: Ctx }) {
  const c = v.current;
  return (
    <div style={sx(`display:grid; grid-template-columns:${v.detailCols}; gap:14px`)}>
      <div style={sx(`background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:${v.cardPad}`)}>
        <div style={sx("display:flex; align-items:center; gap:12px")}>
          <div style={sx(`width:46px; height:46px; border-radius:13px; background:${c.tint}; display:flex; align-items:center; justify-content:center; font-size:22px`)}>{c.icon}</div>
          <div style={sx("min-width:0")}>
            <div style={sx("font-size:19px; font-weight:700; color:#14261A; letter-spacing:-0.01em")}>{c.customer}</div>
            <div style={sx("font-size:13px; color:#8B9A90")}>{c.code} · {c.market}</div>
          </div>
          <div style={sx("flex:1")} />
          <div style={sx(`background:${c.statusBg}; color:${c.statusColor}; font-size:12px; font-weight:700; padding:6px 12px; border-radius:20px; white-space:nowrap`)}>{c.status}</div>
        </div>
        <div style={sx("height:1px; background:#EDF1ED; margin:20px 0")} />
        <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(140px,1fr)); gap:16px")}>
          {v.detailFields.map((f, i) => (
            <div key={i}>
              <div style={sx("font-size:12px; color:#8B9A90; font-weight:500")}>{f.label}</div>
              <div style={sx("font-size:14.5px; color:#14261A; font-weight:600; margin-top:5px")}>{f.value}</div>
            </div>
          ))}
        </div>
        <div style={sx("height:1px; background:#EDF1ED; margin:20px 0")} />
        <div style={sx("font-size:14px; font-weight:700; color:#14261A; margin-bottom:10px")}>Nội dung gửi khách</div>
        <div style={sx("background:#F6F9F6; border:1px solid #E9EEE9; border-radius:13px; padding:16px; font-size:14px; line-height:1.75; color:#3C4A40; white-space:pre-wrap")}>{v.messageText}</div>
      </div>

      <div style={sx("display:flex; flex-direction:column; gap:14px")}>
        <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:20px")}>
          <div style={sx("font-size:15px; font-weight:700; color:#14261A")}>Gửi báo giá</div>
          <div style={sx("font-size:13px; color:#8B9A90; margin-top:4px; line-height:1.5")}>Chọn kênh liên hệ của khách</div>
          <div style={sx("display:flex; flex-direction:column; gap:9px; margin-top:14px")}>
            {v.sendChannels.map((ch) => (
              <HButton key={ch.name} s={ch.style} onClick={ch.send}>
                <span style={sx(`width:30px; height:30px; border-radius:9px; background:${ch.color}; color:#fff; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:700`)}>{ch.short}</span>
                <span style={sx("font-size:14px; font-weight:600; color:#14261A")}>{ch.name}</span>
                <span style={sx("flex:1")} />
                <span style={sx("font-size:12.5px; color:#8B9A90; min-width:0; flex:0 1 auto; overflow:hidden; text-overflow:ellipsis; white-space:nowrap")}>{ch.handle}</span>
              </HButton>
            ))}
          </div>
          {v.hasSent && <div style={sx("margin-top:14px; background:#E7F5EC; color:#1B5E33; border-radius:11px; padding:11px 13px; font-size:13px; font-weight:600")}>{v.sentMsg}</div>}
        </div>

        <div style={sx("background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:20px")}>
          <div style={sx("font-size:15px; font-weight:700; color:#14261A; margin-bottom:14px")}>Lịch sử</div>
          <div style={sx("display:flex; flex-direction:column; gap:0")}>
            {v.timeline.map((t, i) => (
              <div key={i} style={sx("display:flex; gap:12px")}>
                <div style={sx("display:flex; flex-direction:column; align-items:center; width:12px")}>
                  <div style={sx(`width:9px; height:9px; border-radius:50%; background:${t.dot}; margin-top:5px; flex-shrink:0`)} />
                  <div style={sx("width:1.5px; flex:1; background:#E6EBE6")} />
                </div>
                <div style={sx("padding-bottom:16px")}>
                  <div style={sx("font-size:13.5px; color:#14261A; font-weight:600")}>{t.text}</div>
                  <div style={sx("font-size:12px; color:#8B9A90; margin-top:2px")}>{t.time}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NewQuote({ v }: { v: Ctx }) {
  return (
    <div style={sx(`background:#fff; border:1px solid #E9EEE9; border-radius:16px; padding:${v.cardPad}; max-width:720px`)}>
      <div style={sx("font-size:17px; font-weight:700; color:#14261A")}>Thông tin báo giá</div>
      <div style={sx("display:grid; grid-template-columns:repeat(auto-fit, minmax(220px,1fr)); gap:16px; margin-top:20px")}>
        {v.newFields.map((f, i) => (
          <label key={i} style={sx("display:flex; flex-direction:column; gap:7px")}>
            <span style={sx("font-size:13px; font-weight:600; color:#3C4A40")}>{f.label}</span>
            <HInput placeholder={f.placeholder} s="height:46px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:11px; padding:0 13px; font-size:14.5px; color:#14261A; outline:none; transition:border-color .16s, box-shadow .16s" focus="border-color:#3EA85C; box-shadow:0 0 0 4px rgba(62,168,92,.14)" />
          </label>
        ))}
      </div>
      <div style={sx("display:flex; gap:10px; margin-top:24px; flex-wrap:wrap")}>
        <HButton s="height:46px; padding:0 22px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14.5px; font-weight:600; cursor:pointer; box-shadow:0 8px 18px -8px rgba(31,116,64,.7)" onClick={v.goQuotes}>Tạo và gửi khách</HButton>
        <HButton s="height:46px; padding:0 20px; border:1px solid #DCE3DC; border-radius:11px; background:#fff; color:#4A5A4E; font-size:14.5px; font-weight:500; cursor:pointer" h="background:#F7FAF7" onClick={v.goQuotes}>Lưu nháp</HButton>
      </div>
    </div>
  );
}

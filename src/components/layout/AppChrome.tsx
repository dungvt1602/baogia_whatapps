"use client";

/* eslint-disable @next/next/no-img-element */
import { useAgoCtx } from "@/components/layout/AgoContext";
import { sx, HButton, HDiv } from "@/components/common/ui";
import { Modals } from "@/features/mock/Modals";

// Khung app: sidebar + topbar dùng chung; nội dung màn = {children} (route segment).
export default function AppChrome({ children }: { children: React.ReactNode }) {
  const v = useAgoCtx();
  return (
    <div
      style={sx(
        "min-height:100vh; display:flex; background:#F4F6F3; animation:agoFade .3s ease both",
      )}
    >
      {/* Sidebar */}
      <div style={sx(v.sidebarStyle)}>
        <div
          style={sx(
            "display:flex; align-items:center; gap:11px; padding:2px 10px 6px",
          )}
        >
          <img
            src="/logo-agofruit.svg"
            alt="agofruit"
            style={sx("height:40px; display:block")}
          />
          <div style={sx("flex:1")} />
          <HButton s={v.closeNavStyle} onClick={v.closeNav}>
            ✕
          </HButton>
        </div>

        <div
          style={sx(
            "font-size:10.5px; font-weight:700; letter-spacing:.18em; text-transform:uppercase; color:rgba(255,255,255,.45); padding:22px 12px 10px",
          )}
        >
          Menu
        </div>

        <div style={sx("display:flex; flex-direction:column; gap:3px")}>
          {v.navItems.map((item) => (
            <HButton
              key={item.label}
              s={item.style}
              h={item.hoverStyle}
              onClick={item.go}
            >
              <span
                style={sx(
                  "width:22px; text-align:center; font-size:15px; opacity:.9",
                )}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
            </HButton>
          ))}
        </div>

        <div style={sx("flex:1")} />

        <div
          style={sx(
            "background:rgba(255,255,255,.08); border:1px solid rgba(255,255,255,.12); border-radius:14px; padding:14px; margin-top:20px; backdrop-filter:blur(4px)",
          )}
        >
          <div style={sx("display:flex; align-items:center; gap:10px")}>
            <div
              style={sx(
                "width:38px; height:38px; border-radius:50%; background:linear-gradient(140deg,#FFC93C,#F5A623); color:#1E3A28; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:14px",
              )}
            >
              {v.userInitials}
            </div>
            <div style={sx("min-width:0")}>
              <div
                style={sx(
                  "font-size:13.5px; font-weight:600; color:#fff; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
                )}
              >
                {v.userName}
              </div>
              <div style={sx("font-size:11.5px; color:rgba(255,255,255,.55)")}>
                {v.roleLabel}
              </div>
            </div>
          </div>
          <HButton
            s="width:100%; margin-top:12px; height:36px; border:1px solid rgba(255,255,255,.22); background:transparent; border-radius:9px; font-size:13px; font-weight:500; color:rgba(255,255,255,.85); cursor:pointer; transition:background .14s"
            h="background:rgba(255,255,255,.12); color:#fff"
            onClick={v.logout}
          >
            Đăng xuất
          </HButton>
        </div>
      </div>

      {/* Nút thu gọn / mở rộng sidebar ở giữa cạnh phải (desktop) */}
      <HButton s={v.collapseBtnStyle} onClick={v.toggleCollapse}>
        {v.collapsed ? "›" : "‹"}
      </HButton>

      {v.navOverlay && (
        <HDiv
          s="position:fixed; inset:0; background:rgba(15,35,22,.4); z-index:40"
          onClick={v.closeNav}
        />
      )}

      {/* Main */}
      <div
        style={sx("flex:1; min-width:0; display:flex; flex-direction:column")}
      >
        <div
          style={sx(
            `display:flex; align-items:center; gap:14px; padding:${v.topbarPad}; background:rgba(255,255,255,.82); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); position:sticky; top:0; z-index:20; border-bottom:1px solid #E6EBE6; box-shadow:0 4px 18px -14px rgba(20,38,26,.35)`,
          )}
        >
          <HButton s={v.burgerStyle} onClick={v.openNav}>
            ☰
          </HButton>
          <div style={sx("min-width:0")}>
            <div style={sx("display:flex; align-items:center; gap:9px")}>
              <span
                style={sx(
                  "width:4px; height:20px; border-radius:3px; background:linear-gradient(180deg,#3EA85C,#1F7440); flex-shrink:0",
                )}
              />
              <span
                style={sx(
                  `font-size:${v.titleSize}; font-weight:700; color:#14261A; letter-spacing:-0.02em; line-height:1.2`,
                )}
              >
                {v.pageTitle}
              </span>
            </div>
            <div
              style={sx(
                "font-size:13px; color:#7B8A80; margin-top:3px; padding-left:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis",
              )}
            >
              {v.pageSub}
            </div>
          </div>
          <div style={sx("flex:1")} />
          <div
            style={sx(
              `display:${v.colDisplay}; font-size:12.5px; color:#7B8A80; background:#F1F5F1; border-radius:20px; padding:7px 14px; white-space:nowrap`,
            )}
          >
            {v.todayLabel}
          </div>
          <HButton s={v.newBtnStyle} onClick={v.goNewQuote}>
            {v.newBtnLabel}
          </HButton>
        </div>

        <div style={sx(`padding:${v.contentPad}; flex:1`)}>{children}</div>
      </div>

      <Modals v={v} />
    </div>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element */
import type { Ctx } from "./useAgo";
import { sx, HButton, HInput } from "./ui";

const field =
  "display:flex; align-items:center; height:50px; border-radius:11px; background:rgba(14,48,30,.38); border:1px solid rgba(255,255,255,.14)";
const icon =
  "width:48px; text-align:center; color:rgba(255,255,255,.8); font-size:16px; border-right:1px solid rgba(255,255,255,.22)";
const inp =
  "flex:1; height:100%; background:transparent; border:none; outline:none; padding:0 14px; font-size:14.5px; color:#fff";
const yellowBtn =
  "height:50px; border:none; border-radius:11px; background:linear-gradient(140deg,#FFC93C,#F5A623); color:#1E3A28; font-size:14.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; box-shadow:0 12px 26px -10px rgba(245,166,35,.75); transition:filter .15s, transform .12s";

export default function Auth({ v }: { v: Ctx }) {
  const { st } = v;
  return (
    <div style={sx("min-height:100vh; position:relative; overflow:hidden; display:flex; align-items:center; justify-content:center; padding:40px 18px; background:linear-gradient(135deg, #2C6B52 0%, #35876A 45%, #2F8F4E 100%)")}>
      <div style={sx("position:absolute; width:560px; height:560px; border-radius:50%; background:radial-gradient(circle at 35% 35%, #57C785, transparent 68%); top:-160px; left:-140px; filter:blur(10px); opacity:.75")} />
      <div style={sx("position:absolute; width:620px; height:620px; border-radius:46% 54% 60% 40% / 50% 42% 58% 50%; background:linear-gradient(160deg, #5A3FA0, #2F6FD6 70%); bottom:-260px; left:8%; filter:blur(6px); opacity:.55")} />
      <div style={sx("position:absolute; width:480px; height:480px; border-radius:50%; background:radial-gradient(circle at 60% 40%, #3FD6A0, transparent 70%); bottom:-120px; right:-120px; opacity:.6")} />

      <div style={sx("position:relative; width:100%; max-width:410px; border-radius:26px; padding:38px 34px 34px; background:linear-gradient(165deg, rgba(255,255,255,.30), rgba(160,235,190,.20)); backdrop-filter:blur(22px); -webkit-backdrop-filter:blur(22px); border:1px solid rgba(255,255,255,.35); box-shadow:0 34px 70px -28px rgba(8,40,24,.55); animation:agoRise .5s ease both")}>
        <div style={sx("display:flex; flex-direction:column; align-items:center; gap:14px; margin-bottom:26px")}>
          <div style={sx("width:86px; height:86px; border-radius:50%; background:rgba(255,255,255,.92); display:flex; align-items:center; justify-content:center; box-shadow:0 10px 26px -10px rgba(8,40,24,.5)")}>
            <img src="/branding.png" alt="agofruit" style={sx("width:62px; display:block")} />
          </div>
          <div style={sx("color:#fff; font-size:26px; font-weight:500; letter-spacing:.02em")}>{v.showLogin ? "Đăng nhập" : "Đăng ký"}</div>
        </div>

        {v.showLogin && (
          <div style={sx("display:flex; flex-direction:column; gap:13px")}>
            <div style={sx(field)}>
              <span style={sx(icon)}>✉</span>
              <HInput className="glass-inp" type="email" value={st.email} onChange={v.onEmail} placeholder="Email công ty" s={inp} />
            </div>
            <div style={sx(field)}>
              <span style={sx(icon.replace("16px", "15px"))}>🔒</span>
              <HInput className="glass-inp" type={v.passType} value={st.password} onChange={v.onPassword} placeholder="Mật khẩu" s={inp} />
              <HButton s="border:none; background:none; color:rgba(255,255,255,.75); cursor:pointer; padding:0 14px; font-size:15px" onClick={v.togglePass}>{v.eyeIcon}</HButton>
            </div>

            {st.loginError && <div style={sx("background:rgba(120,20,16,.45); border:1px solid rgba(255,255,255,.18); color:#FFD9D6; border-radius:10px; padding:10px 13px; font-size:13px")}>Vui lòng nhập email và mật khẩu.</div>}

            <HButton s={yellowBtn} h="filter:brightness(1.06); transform:translateY(-1px)" onClick={v.doLogin}>Đăng nhập</HButton>

            <div style={sx("display:flex; align-items:center; justify-content:space-between; margin-top:2px")}>
              <label style={sx("display:flex; align-items:center; gap:8px; color:rgba(255,255,255,.85); font-size:12.5px; cursor:pointer")}>
                <input type="checkbox" checked={st.remember} onChange={v.toggleRemember} style={sx("width:15px; height:15px; accent-color:#2F8F4E; cursor:pointer")} />
                Ghi nhớ đăng nhập
              </label>
              <a href="#" style={sx("font-size:12.5px; color:rgba(255,255,255,.85)")}>Quên mật khẩu?</a>
            </div>

            <div style={sx("display:flex; align-items:center; gap:0; margin:14px 0 4px")}>
              <div style={sx("flex:1; height:1px; background:rgba(255,255,255,.35)")} />
              <div style={sx("width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; color:#2C6B52; font-size:14px; margin:0 12px; box-shadow:0 6px 14px -6px rgba(8,40,24,.5)")}>⌄</div>
              <div style={sx("flex:1; height:1px; background:rgba(255,255,255,.35)")} />
            </div>

            <HButton s="height:48px; border:none; border-radius:11px; background:linear-gradient(140deg,#4A7CF6,#3B63D9); color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:transform .12s, filter .15s" h="filter:brightness(1.08); transform:translateY(-1px)" onClick={v.doLogin}>Đăng nhập với Google</HButton>
            <HButton s="height:48px; border:none; border-radius:11px; background:linear-gradient(140deg,#38AEF2,#2490D6); color:#fff; font-size:14px; font-weight:600; cursor:pointer; transition:transform .12s, filter .15s" h="filter:brightness(1.08); transform:translateY(-1px)" onClick={v.doLogin}>Đăng nhập với Microsoft</HButton>

            <div style={sx("text-align:center; margin-top:14px; font-size:13.5px; color:rgba(255,255,255,.85)")}>Chưa có tài khoản? <a href="#" onClick={v.goRegister} style={sx("font-weight:700; color:#fff")}>Đăng ký</a></div>
          </div>
        )}

        {v.showRegister && (
          <div style={sx("display:flex; flex-direction:column; gap:13px")}>
            <div style={sx(field)}>
              <span style={sx(icon.replace("16px", "15px"))}>☺</span>
              <HInput className="glass-inp" value={st.regName} onChange={v.onRegName} placeholder="Họ và tên" s={inp} />
            </div>
            <div style={sx(field)}>
              <span style={sx(icon)}>✉</span>
              <HInput className="glass-inp" type="email" value={st.regEmail} onChange={v.onRegEmail} placeholder="Email công ty" s={inp} />
            </div>
            <div style={sx(field)}>
              <span style={sx(icon.replace("16px", "15px"))}>🔒</span>
              <HInput className="glass-inp" type="password" value={st.regPass} onChange={v.onRegPass} placeholder="Mật khẩu (tối thiểu 8 ký tự)" s={inp} />
            </div>
            <div style={sx(field)}>
              <span style={sx(icon.replace("16px", "15px"))}>🔒</span>
              <HInput className="glass-inp" type="password" value={st.regPass2} onChange={v.onRegPass2} placeholder="Nhập lại mật khẩu" s={inp} />
            </div>

            {st.regError && <div style={sx("background:rgba(120,20,16,.45); border:1px solid rgba(255,255,255,.18); color:#FFD9D6; border-radius:10px; padding:10px 13px; font-size:13px")}>{st.regError}</div>}
            {st.regDone && <div style={sx("background:rgba(20,90,48,.55); border:1px solid rgba(255,255,255,.22); color:#D8F7E3; border-radius:10px; padding:10px 13px; font-size:13px; font-weight:600")}>Đăng ký thành công! Bạn có thể đăng nhập ngay.</div>}

            <HButton s={yellowBtn} h="filter:brightness(1.06); transform:translateY(-1px)" onClick={v.doRegister}>Tạo tài khoản</HButton>

            <div style={sx("text-align:center; margin-top:10px; font-size:13.5px; color:rgba(255,255,255,.85)")}>Đã có tài khoản? <a href="#" onClick={v.goLogin} style={sx("font-weight:700; color:#fff")}>Đăng nhập</a></div>
          </div>
        )}
      </div>
    </div>
  );
}

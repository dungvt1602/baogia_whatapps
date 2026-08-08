"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { sx, HButton, HInput } from "@/components/common/ui";

const field = "display:flex; align-items:center; height:50px; border-radius:11px; background:rgba(14,48,30,.38); border:1px solid rgba(255,255,255,.14)";
const icon = "width:48px; text-align:center; color:rgba(255,255,255,.8); font-size:15px; border-right:1px solid rgba(255,255,255,.22)";
const inp = "flex:1; height:100%; background:transparent; border:none; outline:none; padding:0 14px; font-size:14.5px; color:#fff";
const yellowBtn = "height:50px; border:none; border-radius:11px; background:linear-gradient(140deg,#FFC93C,#F5A623); color:#1E3A28; font-size:14.5px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; cursor:pointer; box-shadow:0 12px 26px -10px rgba(245,166,35,.75); transition:filter .15s, transform .12s";

export default function Login() {
  const router = useRouter();
  const { login } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("ngoc.anh@agogroup.vn");
  const [password, setPassword] = useState("••••••••");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loginError, setLoginError] = useState(false);
  const [reg, setReg] = useState({ name: "", email: "", pass: "", pass2: "" });
  const [regError, setRegError] = useState("");
  const [regDone, setRegDone] = useState(false);

  function doLogin() {
    if (!email || !password) return setLoginError(true);
    const name = regDone && reg.name ? reg.name : undefined;
    if (login(email, password, name)) router.push("/tong-quan");
  }
  function doRegister() {
    if (!reg.name || !reg.email || !reg.pass) return (setRegError("Vui lòng điền đầy đủ thông tin."), setRegDone(false));
    if (reg.pass.length < 8) return (setRegError("Mật khẩu tối thiểu 8 ký tự."), setRegDone(false));
    if (reg.pass !== reg.pass2) return (setRegError("Mật khẩu nhập lại không khớp."), setRegDone(false));
    setRegError(""); setRegDone(true); setEmail(reg.email); setPassword(reg.pass); setMode("login");
  }

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
          <div style={sx("color:#fff; font-size:26px; font-weight:500; letter-spacing:.02em")}>{mode === "login" ? "Đăng nhập" : "Đăng ký"}</div>
        </div>

        {mode === "login" && (
          <div style={sx("display:flex; flex-direction:column; gap:13px")}>
            <div style={sx(field)}>
              <span style={sx(icon)}>✉</span>
              <HInput className="glass-inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email công ty" s={inp} />
            </div>
            <div style={sx(field)}>
              <span style={sx(icon)}>🔒</span>
              <HInput className="glass-inp" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mật khẩu" s={inp} />
              <HButton s="border:none; background:none; color:rgba(255,255,255,.75); cursor:pointer; padding:0 14px; font-size:15px" onClick={() => setShowPass(!showPass)}>{showPass ? "🙈" : "👁"}</HButton>
            </div>
            {loginError && <div style={sx("background:rgba(120,20,16,.45); border:1px solid rgba(255,255,255,.18); color:#FFD9D6; border-radius:10px; padding:10px 13px; font-size:13px")}>Vui lòng nhập email và mật khẩu.</div>}
            <HButton s={yellowBtn} h="filter:brightness(1.06); transform:translateY(-1px)" onClick={doLogin}>Đăng nhập</HButton>
            <div style={sx("display:flex; align-items:center; justify-content:space-between; margin-top:2px")}>
              <label style={sx("display:flex; align-items:center; gap:8px; color:rgba(255,255,255,.85); font-size:12.5px; cursor:pointer")}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} style={sx("width:15px; height:15px; accent-color:#2F8F4E; cursor:pointer")} />
                Ghi nhớ đăng nhập
              </label>
              <a href="#" style={sx("font-size:12.5px; color:rgba(255,255,255,.85)")}>Quên mật khẩu?</a>
            </div>
            <div style={sx("text-align:center; margin-top:14px; font-size:13.5px; color:rgba(255,255,255,.85)")}>Chưa có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); setMode("register"); setRegError(""); setRegDone(false); }} style={sx("font-weight:700; color:#fff")}>Đăng ký</a></div>
          </div>
        )}

        {mode === "register" && (
          <div style={sx("display:flex; flex-direction:column; gap:13px")}>
            <div style={sx(field)}><span style={sx(icon)}>☺</span><HInput className="glass-inp" value={reg.name} onChange={(e) => setReg({ ...reg, name: e.target.value })} placeholder="Họ và tên" s={inp} /></div>
            <div style={sx(field)}><span style={sx(icon)}>✉</span><HInput className="glass-inp" type="email" value={reg.email} onChange={(e) => setReg({ ...reg, email: e.target.value })} placeholder="Email công ty" s={inp} /></div>
            <div style={sx(field)}><span style={sx(icon)}>🔒</span><HInput className="glass-inp" type="password" value={reg.pass} onChange={(e) => setReg({ ...reg, pass: e.target.value })} placeholder="Mật khẩu (tối thiểu 8 ký tự)" s={inp} /></div>
            <div style={sx(field)}><span style={sx(icon)}>🔒</span><HInput className="glass-inp" type="password" value={reg.pass2} onChange={(e) => setReg({ ...reg, pass2: e.target.value })} placeholder="Nhập lại mật khẩu" s={inp} /></div>
            {regError && <div style={sx("background:rgba(120,20,16,.45); border:1px solid rgba(255,255,255,.18); color:#FFD9D6; border-radius:10px; padding:10px 13px; font-size:13px")}>{regError}</div>}
            {regDone && <div style={sx("background:rgba(20,90,48,.55); border:1px solid rgba(255,255,255,.22); color:#D8F7E3; border-radius:10px; padding:10px 13px; font-size:13px; font-weight:600")}>Đăng ký thành công! Bạn có thể đăng nhập ngay.</div>}
            <HButton s={yellowBtn} h="filter:brightness(1.06); transform:translateY(-1px)" onClick={doRegister}>Tạo tài khoản</HButton>
            <div style={sx("text-align:center; margin-top:10px; font-size:13.5px; color:rgba(255,255,255,.85)")}>Đã có tài khoản? <a href="#" onClick={(e) => { e.preventDefault(); setMode("login"); setLoginError(false); }} style={sx("font-weight:700; color:#fff")}>Đăng nhập</a></div>
          </div>
        )}
      </div>
    </div>
  );
}

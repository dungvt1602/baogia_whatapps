"use client";

import type { Ctx } from "@/components/layout/useAgo";
import { sx, HButton, HInput, HTextarea } from "@/components/common/ui";

const overlay = "position:fixed; inset:0; z-index:60; display:flex; align-items:center; justify-content:center; padding:20px";
const scrim = "position:absolute; inset:0; background:rgba(15,35,22,.45); backdrop-filter:blur(3px)";
const closeBtn = "width:32px; height:32px; border:none; background:#F1F4F1; border-radius:9px; cursor:pointer; color:#4A5A4E; font-size:13px";
const label = "display:flex; flex-direction:column; gap:7px";
const labelSpan = "font-size:13px; font-weight:600; color:#3C4A40";
const inp = "height:46px; border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:11px; padding:0 13px; font-size:14.5px; color:#14261A; outline:none";
const inpFocus = "border-color:#3EA85C; box-shadow:0 0 0 4px rgba(62,168,92,.14)";
const saveBtn = "flex:1; height:46px; border:none; border-radius:11px; background:linear-gradient(140deg,#3EA85C,#1F7440); color:#fff; font-size:14.5px; font-weight:600; cursor:pointer; box-shadow:0 8px 18px -8px rgba(31,116,64,.7)";
const cancelBtn = "height:46px; padding:0 18px; border:1px solid #DCE3DC; border-radius:11px; background:#fff; color:#4A5A4E; font-size:14.5px; font-weight:500; cursor:pointer";

export function Modals({ v }: { v: Ctx }) {
  const { st } = v;
  return (
    <>
      {st.uOpen && (
        <div style={sx(overlay)}>
          <div onClick={v.closeUser} style={sx(scrim)} />
          <div style={sx("position:relative; width:100%; max-width:440px; background:#fff; border-radius:20px; padding:26px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5); animation:agoRise .3s ease both")}>
            <div style={sx("display:flex; align-items:center; gap:10px")}>
              <div style={sx("font-size:18px; font-weight:700; color:#14261A; flex:1")}>{v.uTitle}</div>
              <HButton s={closeBtn} onClick={v.closeUser}>✕</HButton>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:14px; margin-top:20px")}>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Họ và tên</span>
                <HInput value={st.uForm.name} onChange={v.onUfName} placeholder="VD: Lê Ngọc Anh" s={inp} focus={inpFocus} />
              </label>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Email công ty</span>
                <HInput type="email" value={st.uForm.email} onChange={v.onUfEmail} placeholder="ten.ban@agogroup.vn" s={inp} focus={inpFocus} />
              </label>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Phòng ban</span>
                <HInput value={st.uForm.dept} onChange={v.onUfDept} placeholder="VD: Kinh doanh" s={inp} focus={inpFocus} />
              </label>
              <div style={sx(label)}>
                <span style={sx(labelSpan)}>Quyền</span>
                <div style={sx("display:flex; background:#F1F4F1; border-radius:10px; padding:4px; gap:4px; align-self:flex-start")}>
                  <HButton s={v.ufStaffStyle} onClick={v.ufPickStaff}>Nhân viên</HButton>
                  <HButton s={v.ufAdminStyle} onClick={v.ufPickAdmin}>Admin</HButton>
                </div>
              </div>
              <div style={sx("display:flex; gap:10px; margin-top:6px")}>
                <HButton s={saveBtn} onClick={v.saveUser}>Lưu</HButton>
                <HButton s={cancelBtn} h="background:#F7FAF7" onClick={v.closeUser}>Hủy</HButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {st.tplOpen && (
        <div style={sx(overlay)}>
          <div onClick={v.closeTpl} style={sx(scrim)} />
          <div style={sx("position:relative; width:100%; max-width:520px; background:#fff; border-radius:20px; padding:26px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5); animation:agoRise .3s ease both")}>
            <div style={sx("display:flex; align-items:center; gap:10px")}>
              <div style={sx("font-size:18px; font-weight:700; color:#14261A; flex:1")}>{v.tplTitle}</div>
              <HButton s={closeBtn} onClick={v.closeTpl}>✕</HButton>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:14px; margin-top:20px")}>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Tên template</span>
                <HInput value={st.tplForm.name} onChange={v.onTplName} placeholder="VD: Chuẩn quốc tế" s={inp} focus={inpFocus} />
              </label>
              <div style={sx(label)}>
                <span style={sx(labelSpan)}>Biểu tượng</span>
                <div style={sx("display:flex; gap:8px")}>
                  {v.tplIcons.map((ic) => (
                    <HButton key={ic.icon} s={ic.style} onClick={ic.pick}>{ic.icon}</HButton>
                  ))}
                </div>
              </div>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Nội dung tin nhắn</span>
                <HTextarea value={st.tplForm.content} onChange={v.onTplContent} placeholder="Dùng {khách hàng}, {mã}, {mặt hàng}, {giá}… để tự điền thông tin báo giá" rows={7} s="border-width:1.5px; border-style:solid; border-color:#DFE6E0; border-radius:11px; padding:12px 13px; font-size:14px; line-height:1.6; color:#14261A; outline:none; resize:vertical; font-family:inherit" focus={inpFocus} />
              </label>
              <div style={sx("font-size:12px; color:#8B9A90; line-height:1.6; background:#F6F9F6; border-radius:9px; padding:9px 12px")}>Biến tự điền: <strong>{"{khách hàng}"}</strong> <strong>{"{mã}"}</strong> <strong>{"{mặt hàng}"}</strong> <strong>{"{số lượng}"}</strong> <strong>{"{giá}"}</strong> <strong>{"{incoterm}"}</strong> <strong>{"{thanh toán}"}</strong> <strong>{"{hiệu lực}"}</strong></div>
              <div style={sx("display:flex; gap:10px; margin-top:4px")}>
                <HButton s={saveBtn} onClick={v.saveTpl}>Lưu template</HButton>
                <HButton s={cancelBtn} h="background:#F7FAF7" onClick={v.closeTpl}>Hủy</HButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {st.cOpen && (
        <div style={sx(overlay)}>
          <div onClick={v.closeCust} style={sx(scrim)} />
          <div style={sx("position:relative; width:100%; max-width:440px; background:#fff; border-radius:20px; padding:26px; box-shadow:0 30px 70px -20px rgba(8,40,24,.5); animation:agoRise .3s ease both")}>
            <div style={sx("display:flex; align-items:center; gap:10px")}>
              <div style={sx("font-size:18px; font-weight:700; color:#14261A; flex:1")}>{v.cTitle}</div>
              <HButton s={closeBtn} onClick={v.closeCust}>✕</HButton>
            </div>
            <div style={sx("display:flex; flex-direction:column; gap:14px; margin-top:20px")}>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Tên khách hàng</span>
                <HInput value={st.cForm.name} onChange={v.onCfName} placeholder="VD: Fresh Orient GmbH" s={inp} focus={inpFocus} />
              </label>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Thị trường</span>
                <HInput value={st.cForm.market} onChange={v.onCfMarket} placeholder="VD: Hamburg, Đức" s={inp} focus={inpFocus} />
              </label>
              <label style={sx(label)}>
                <span style={sx(labelSpan)}>Mặt hàng quan tâm</span>
                <HInput value={st.cForm.tags} onChange={v.onCfTags} placeholder="VD: Thanh long, Xoài (cách nhau dấu phẩy)" s={inp} focus={inpFocus} />
              </label>
              <div style={sx("display:flex; gap:10px; margin-top:6px")}>
                <HButton s={saveBtn} onClick={v.saveCust}>Lưu</HButton>
                <HButton s={cancelBtn} h="background:#F7FAF7" onClick={v.closeCust}>Hủy</HButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

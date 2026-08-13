// Bản đồ giữa "key màn hình" (dùng nội bộ) và URL thật.

export const PATHS: Record<string, string> = {
  dash: "/tong-quan",
  quotes: "/bao-gia",
  template: "/bao-gia/mau", // mock: chọn mẫu gửi cho 1 báo giá
  detail: "/bao-gia/chi-tiet", // mock: chi tiết báo giá
  customers: "/khach-hang",
  new: "/bao-gia/tao",
  tpl: "/template",
  send: "/gui-bao-gia",
  team: "/nguoi-dung",
  channels: "/kenh-gui",
  receiveChannels: "/kenh-nhan",
  logs: "/nhat-ky",
  sendjobs: "/log-gui",
  inbox: "/phan-hoi",
};

export function keyToPath(key: string): string {
  return PATHS[key] || "/tong-quan";
}

// Suy ra key màn từ URL. /template và /template/[id] -> 'tpl'.
export function pathToKey(pathname: string): string {
  if (pathname === "/" ) return "dash";
  if (pathname.startsWith("/template")) return "tpl";
  const entry = Object.entries(PATHS)
    .filter(([, p]) => p !== "/template")
    .sort((a, b) => b[1].length - a[1].length) // path dài hơn ưu tiên (/bao-gia/mau trước /bao-gia)
    .find(([, p]) => pathname === p || pathname.startsWith(p + "/"));
  return entry ? entry[0] : "dash";
}

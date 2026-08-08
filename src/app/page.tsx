import { redirect } from "next/navigation";

// Vào "/" -> chuyển tới trang tổng quan (layout (app) sẽ đẩy ra /login nếu chưa đăng nhập).
export default function Home() {
  redirect("/tong-quan");
}

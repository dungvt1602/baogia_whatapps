import PublicQuotePage from "@/features/supplier-rfqs/public/public-quote-page";

// Trang công khai nhập giá: token trong URL là bí mật của lời mời, truyền nguyên chuỗi xuống.
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicQuotePage token={token} />;
}

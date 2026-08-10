import TemplateCustomersScreen from "@/features/templates/TemplateCustomersScreen";

// Trang quản lý khách hàng của 1 template (thay cho popup kéo-thả cũ).
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TemplateCustomersScreen templateId={id} />;
}

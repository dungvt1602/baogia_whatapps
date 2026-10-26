import RfqDetailScreen from "@/features/supplier-rfqs/components/rfq-detail-screen";

// id RFQ lấy từ URL /bao-gia-ncc/[id]; để chuỗi nguyên, không ép số.
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <RfqDetailScreen rfqId={id} />;
}

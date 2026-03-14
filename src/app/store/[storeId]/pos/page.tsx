import PosClient from "@/components/pos/pos-client";

export default async function PosPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <PosClient storeId={storeId} />;
}

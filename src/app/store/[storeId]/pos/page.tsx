import PosClient from "@/components/pos/pos-client";

export default function PosPage({ params }: { params: { storeId: string } }) {
  return <PosClient storeId={params.storeId} />;
}

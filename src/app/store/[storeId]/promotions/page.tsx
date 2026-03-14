import StorePromotionsClient from "@/components/promotions/store-promotions-client";

export default async function StorePromotionsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <StorePromotionsClient storeId={storeId} />;
}

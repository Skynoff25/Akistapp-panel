import OrdersClient from "@/components/orders/orders-client";

export default async function StoreOrdersPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <OrdersClient storeId={storeId} />;
}

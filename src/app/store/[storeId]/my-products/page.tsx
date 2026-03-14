import StoreProductsClient from "@/components/products/store-products-client";

export default async function StoreMyProductsPage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <StoreProductsClient storeId={storeId} />;
}

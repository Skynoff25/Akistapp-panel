import MyStoreClient from "@/components/stores/my-store-client";

export default async function MyStorePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <MyStoreClient storeId={storeId} />;
}

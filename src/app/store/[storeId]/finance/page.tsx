import FinanceClient from "@/components/finance/finance-client";

export default async function FinancePage({ params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;
  return <FinanceClient storeId={storeId} />;
}

import FinanceClient from "@/components/finance/finance-client";

export default function FinancePage({ params }: { params: { storeId: string } }) {
  return <FinanceClient storeId={params.storeId} />;
}

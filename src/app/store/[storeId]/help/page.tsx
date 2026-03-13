import HelpClient from "@/components/help/help-client";

export default async function HelpPage({
  params,
}: {
  params: Promise<{ storeId: string }>;
}) {
  const { storeId } = await params;
  return <HelpClient storeId={storeId} />;
}

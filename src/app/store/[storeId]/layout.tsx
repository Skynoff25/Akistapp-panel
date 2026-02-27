
import StoreSidebar from '@/components/layout/store-sidebar';
import DashboardHeader from '@/components/layout/dashboard-header';

export default function StoreDashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { storeId: string };
}) {
  return (
    <div className="flex min-h-screen">
      <StoreSidebar storeId={params.storeId} />
      <div className="flex-1 flex flex-col">
        <DashboardHeader storeId={params.storeId} />
        <main className="p-4 sm:p-6 md:p-8 bg-background flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

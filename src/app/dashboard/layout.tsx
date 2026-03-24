export const dynamic = 'force-dynamic';
export const revalidate = 0;
import Sidebar from '@/components/layout/sidebar';
import DashboardHeader from '@/components/layout/dashboard-header';
import SystemEmergencyBanner from '@/components/dashboard/system-emergency-banner';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <SystemEmergencyBanner />
        <DashboardHeader />
        <main className="p-4 sm:p-6 md:p-8 bg-background flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

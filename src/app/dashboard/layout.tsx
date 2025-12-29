
import { DashboardShell } from './_components/DashboardShell';
import { NavigationLoadingProvider } from '@/components/providers/navigation-loading-provider';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <NavigationLoadingProvider>
        <DashboardShell>
          {children}
        </DashboardShell>
      </NavigationLoadingProvider>
    </div>
  );
}


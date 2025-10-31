
import { DashboardShell } from './_components/DashboardShell';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <DashboardShell>
        {children}
      </DashboardShell>
    </div>
  );
}

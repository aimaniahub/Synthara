
import { DashboardShell } from './_components/DashboardShell';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-light dark:bg-gradient-slate">
      {/* Modern background patterns */}
      <div className="fixed inset-0 opacity-30 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-0 left-0 w-full h-full">
          <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
            <defs>
              <linearGradient id="modernGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.2)" />
                <stop offset="100%" stopColor="rgba(147, 197, 253, 0.1)" />
              </linearGradient>
              <linearGradient id="modernGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="rgba(147, 197, 253, 0.1)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.2)" />
              </linearGradient>
            </defs>
            <path d="M0,0 Q300,80 600,0 T1000,0 L1000,200 Q700,120 400,200 T0,200 Z" fill="url(#modernGradient1)" />
            <path d="M0,800 Q300,720 600,800 T1000,800 L1000,1000 L0,1000 Z" fill="url(#modernGradient2)" />
          </svg>
        </div>
      </div>

      <DashboardShell>
        {children}
      </DashboardShell>
    </div>
  );
}

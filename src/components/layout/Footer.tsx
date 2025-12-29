import Link from 'next/link';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background pt-24 pb-12">
      <div className="container-responsive">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-16 mb-24">
          <div className="space-y-8">
            <Link href="/" className="inline-block transform hover:scale-105 transition-transform">
              <SyntharaLogo className="h-10 w-auto text-foreground" />
            </Link>
            <p className="text-muted-foreground text-lg leading-relaxed max-w-xs">
              Empowering teams with high-fidelity synthetic data and intelligent web extraction.
            </p>
            <div className="flex gap-4">
              {/* Social links could go here */}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:col-span-3 gap-12">
            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-widest mb-8">Platform</h3>
              <ul className="space-y-4">
                <li><Link href="/#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
                <li><Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors">Dashboard</Link></li>
                <li><Link href="/dashboard/generate" className="text-muted-foreground hover:text-primary transition-colors">Data Generation</Link></li>
                <li><Link href="/dashboard/analysis" className="text-muted-foreground hover:text-primary transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-widest mb-8">Resources</h3>
              <ul className="space-y-4">
                <li><Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">Guides</Link></li>
                <li><Link href="/#team" className="text-muted-foreground hover:text-primary transition-colors">Community</Link></li>
                <li><Link href="/help" className="text-muted-foreground hover:text-primary transition-colors">Support</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold text-foreground text-sm uppercase tracking-widest mb-8">Company</h3>
              <ul className="space-y-4">
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-primary transition-colors">Contact</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="pt-12 border-t flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Synthara AI. All rights reserved.
          </p>
          <div className="flex gap-8">
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">Status</Link>
            <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">Incident History</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

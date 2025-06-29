import Link from 'next/link';
import { SyntharaLogo } from '@/components/icons/SyntharaLogo';

export function Footer() {
  const currentYear = new Date().getFullYear();
  const footerNavItems = [
    { name: 'About', href: '#' },
    { name: 'Documentation', href: '#' },
    { name: 'Contact Us', href: '#' },
    { name: 'Privacy Policy', href: '#' },
    { name: 'Terms of Service', href: '#' },
  ];

  return (
    <footer className="bg-card border-t border-border mt-auto">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <Link href="/" className="inline-block mb-4">
              <SyntharaLogo className="h-10 w-auto" />
            </Link>
            <p className="text-muted-foreground text-sm">
              Generate Synthetic Data with Intelligence.
            </p>
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold mb-3 text-foreground">Quick Links</h3>
            <ul className="space-y-2">
              {footerNavItems.map((item) => (
                <li key={item.name}>
                  <Link href={item.href} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-headline text-lg font-semibold mb-3 text-foreground">Stay Connected</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get the latest updates and news from Synthara AI.
            </p>
            {/* Newsletter placeholder - can be implemented later */}
            {/* <form className="flex gap-2">
              <Input type="email" placeholder="Enter your email" className="flex-grow" />
              <Button type="submit" variant="default">Subscribe</Button>
            </form> */}
          </div>
        </div>
        <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>&copy; {currentYear} Synthara AI. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}

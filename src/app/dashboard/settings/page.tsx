
// This page can be an alias or merged into the profile page.
// For now, redirecting to profile page or showing a simple message.
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings as SettingsIcon } from 'lucide-react';


export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-headline font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground">General application settings and configurations.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline flex items-center"><SettingsIcon className="mr-2"/>Application Settings</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground mb-4">Most user-specific settings like profile, preferences, and security are managed under your <Link href="/dashboard/profile" className="text-primary hover:underline">Profile page</Link>.</p>
            <p className="text-muted-foreground">This section is reserved for broader application settings if needed in the future.</p>
            <Button asChild className="mt-6">
                <Link href="/dashboard/profile">Go to Profile &amp; Settings</Link>
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}

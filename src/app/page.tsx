
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Users, Code, Activity, School, Database, BarChart3, Zap, ShieldCheck, Settings2, ArrowRight, LogIn, Briefcase, Sparkles } from 'lucide-react';

import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import { Footer } from '@/components/layout/Footer';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const features = [
  { name: 'Intelligent Data Generation', icon: Database, description: 'Create realistic synthetic datasets tailored to your needs using advanced AI models.' },
  { name: 'In-depth Data Analysis', icon: BarChart3, description: 'Automatically analyze generated data for quality, insights, and potential issues.' },
  { name: 'Seamless ML Integration', icon: Zap, description: 'Train, evaluate, and deploy machine learning models directly within the platform.' },
  { name: 'Intuitive User Experience', icon: Settings2, description: 'A clean, modern interface designed for ease of use and efficient workflows.' },
  { name: 'Robust Security', icon: ShieldCheck, description: 'Your data and models are protected with industry-standard security practices.' },
  { name: 'Developer Friendly API', icon: Code, description: 'Integrate Synthara into your existing workflows with our powerful and easy-to-use API.' },
];

const targetAudiences = [
  { name: 'Data Scientists', icon: Users, description: 'Accelerate research and model development with high-quality synthetic data.' },
  { name: 'Developers & Testers', icon: Code, description: 'Easily integrate synthetic data generation into your applications and testing pipelines.' },
  { name: 'Business Analysts', icon: Activity, description: 'Explore scenarios and gain insights without compromising real sensitive data.' },
  { name: 'Educators & Students', icon: School, description: 'Access diverse and safe datasets for learning and experimentation in data science.' },
];

const useCases = [
  { title: 'Software Testing', items: ['Generate diverse test data', 'Cover edge cases effectively', 'Reduce reliance on production data'] },
  { title: 'AI Model Training', items: ['Augment limited datasets', 'Create balanced datasets', 'Improve model robustness'] },
  { title: 'Data Privacy Compliance', items: ['Anonymize sensitive information', 'Share data safely', 'Meet GDPR, CCPA requirements'] },
  { title: 'Product Demonstrations', items: ['Showcase features with realistic data', 'Protect customer privacy', 'Create compelling demos'] },
];

const teamMembers = [
  { name: 'Harsha M', role: 'Team Lead', college: 'AIML, Govt. Eng. College Challakere', imageHint: 'person student coding' },
  { name: 'Maruti Gore', role: 'Developer', college: 'AIML, Govt. Eng. College Challakere', imageHint: 'person student tech' },
  { name: 'Manogna', role: 'Researcher', college: 'AIML, Govt. Eng. College Challakere', imageHint: 'person student thinking' },
  { name: 'Sumanth Prasad TM', role: 'Designer', college: 'AIML, Govt. Eng. College Challakere', imageHint: 'person student creative' },
];


export default async function HomePage() {
  const supabase = await createSupabaseServerClient();
  async function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
    return Promise.race([
      p,
      new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
    ]) as Promise<T>;
  }
  const { data: { user } = { user: null } } = supabase
    ? await withTimeout<any>(supabase.auth.getUser(), 2000, { data: { user: null } })
    : ({ data: { user: null } } as any);

  return (
    <div className="flex flex-col min-h-screen bg-background relative">

      <header className="relative z-50 py-4 border-b bg-background">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" aria-label="Synthara AI Homepage" className="flex-shrink-0">
            <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto text-foreground" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Button variant="ghost" asChild>
              <Link href="#features">Platform</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#solutions">Solutions</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#team">Resources</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/help">Customers</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#pricing">Pricing</Link>
            </Button>

            <Button variant="outline" asChild>
              <Link href="/help">Get Demo</Link>
            </Button>

            {user ? (
                <Button asChild variant="default">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            ) : (
                <Button asChild variant="default">
                    <Link href="/auth">Start for Free →</Link>
                </Button>
            )}

            {!user && (
              <Button variant="ghost" asChild>
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-2">
            {user ? (
                <Button size="sm" asChild>
                    <Link href="/dashboard">Dashboard</Link>
                </Button>
            ) : (
                <Button size="sm" asChild>
                    <Link href="/auth">Start Free</Link>
                </Button>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-grow relative z-10">
        {/* Hero Section */}
        <section className="relative py-16 sm:py-20 md:py-24 lg:py-32 overflow-hidden">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              {/* Left Content */}
              <div className="text-left">
                <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-foreground leading-tight">
                  Secure secrets.<br />
                  Prevent breaches.<br />
                  Keep teams moving.
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl leading-relaxed">
                  Securely manage, orchestrate, and govern your secrets and non-human identities at scale with Synthara's cloud platform integrated with your favorite DevOps tools for secure workflows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild variant="default" className="px-8 py-4 text-lg font-semibold">
                    <Link href={user ? "/dashboard/generate" : "/auth"}>
                      Start for Free →
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Content - CTA */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden border p-8 text-center bg-card">
                  <div className="space-y-6">
                    <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto bg-muted">
                      <Sparkles className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-foreground">Ready to Get Started?</h3>
                    <p className="text-muted-foreground">
                      Join thousands of developers and data scientists who trust Synthara for their synthetic data needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button asChild size="lg" variant="default">
                        <Link href="/auth">Get Started Free</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg">
                        <Link href="/help">Learn More</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Powerful Platform Features
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                Everything you need to generate, manage, and deploy synthetic data at scale with enterprise-grade security and performance.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature) => (
                <div key={feature.name} className="group rounded-xl p-6 border hover:bg-muted transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-muted">
                      <feature.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-semibold mb-2 text-foreground">{feature.name}</h3>
                      <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section id="solutions" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Built For Every Use Case
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                From AI training to compliance testing, Synthara adapts to your specific needs with intelligent data generation.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="rounded-xl p-6 border">
                  <h3 className="font-headline text-xl font-semibold mb-4 text-foreground">{useCase.title}</h3>
                  <ul className="space-y-3">
                    {useCase.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
                        <span className="text-muted-foreground text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Target Audience Section */}
        <section className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
                Trusted by Innovators
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                From startups to enterprises, teams worldwide rely on Synthara for their synthetic data needs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {targetAudiences.map((audience) => (
                <div key={audience.name} className="text-center rounded-xl p-6 border hover:bg-muted transition-colors">
                  <div className="p-4 rounded-full mb-4 inline-block bg-muted">
                    <audience.icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-headline text-lg font-semibold text-foreground mb-2">{audience.name}</h3>
                  <p className="text-muted-foreground text-sm">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <div className="inline-block rounded-full px-4 py-2 mb-4 border">
                <span className="font-semibold text-sm">AIML • Government Engineering College Challakere</span>
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6">
                Meet the Team
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Built by passionate students dedicated to advancing AI and synthetic data technology.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {teamMembers.map((member) => (
                <div key={member.name} className="text-center rounded-xl p-6 border hover:bg-muted transition-colors">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center border mx-auto mb-4">
                    <div className="text-2xl">👤</div>
                  </div>
                  <h3 className="font-headline text-lg font-semibold text-foreground mb-1">{member.name}</h3>
                  <p className="text-sm font-medium text-muted-foreground">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 md:py-32 text-center border-t">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-foreground">
              Ready to Transform Your Data Strategy?
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
              Join thousands of innovators building the future with Synthara AI. Get started today and experience the next generation of synthetic data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Button size="lg" asChild variant="default" className="px-8 py-4 text-lg font-semibold">
                  <Link href="/dashboard">Access Your Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild variant="default" className="px-8 py-4 text-lg font-semibold">
                  <Link href="/auth">Get Started for Free</Link>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild className="px-8 py-4 text-lg font-semibold">
                <Link href="/help">Schedule Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-background">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <SyntharaLogo className="h-8 w-auto text-foreground" />
              </Link>
              <p className="text-muted-foreground text-sm mb-4">
                Generate Synthetic Data with Intelligence.
              </p>
              <p className="text-muted-foreground text-xs">
                © 2024 Synthara AI. All rights reserved.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Features</Link></li>
                <li><Link href="/dashboard" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Dashboard</Link></li>
                <li><Link href="/dashboard/generate" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Data Generation</Link></li>
                <li><Link href="/dashboard/analysis" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/help" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Help Center</Link></li>
                <li><Link href="#team" className="text-muted-foreground hover:text-foreground text-sm transition-colors">About Team</Link></li>
                <li><Link href="/help" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-muted-foreground hover:text-foreground text-sm transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


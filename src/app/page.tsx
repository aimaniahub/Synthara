import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Users, Code, Activity, School, Database, BarChart3, Zap, ShieldCheck, Settings2, ArrowRight, LogIn, Briefcase, Sparkles } from 'lucide-react';

import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import { Footer } from '@/components/layout/Footer';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { withTimeout } from '@/lib/utils/timeout';

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
  let user = null;
  
  if (supabase) {
    try {
      const { data } = await withTimeout<any>(supabase.auth.getUser(), 2000, { data: { user: null } });
      user = data?.user ?? null;
    } catch (error: any) {
      // Handle invalid refresh token or other auth errors gracefully
      console.warn('[HomePage] Auth error (likely expired/invalid session):', error?.message);
      user = null;
    }
  }

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
        {/* Hero Section with Premium Background */}
        <section className="relative py-20 sm:py-28 md:py-32 lg:py-40 overflow-hidden">
          {/* Animated Background Blobs */}
          <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-glow" />
          <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-glow" style={{ animationDelay: '2s' }} />
          <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-400/30 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse-glow" style={{ animationDelay: '4s' }} />

          <div className="absolute inset-0 bg-grid-black dark:bg-grid-white opacity-[0.2]" />

          <div className="container-responsive relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-8 animate-bounce">
                <Sparkles className="w-3 h-3" />
                <span>Next Generation AI Scraper</span>
              </div>

              <h1 className="font-headline text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tight">
                <span className="text-foreground">Turn Web Noise into </span>
                <span className="text-gradient-primary">Structured Intelligence</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl leading-relaxed">
                Transform any natural language query into high-quality, structured CSV datasets.
                Synthara automates search, scraping, and AI-driven cleaning at scale.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 w-full sm:w-auto">
                <Button size="lg" asChild className="h-14 px-10 text-lg font-bold rounded-full shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
                  <Link href={user ? "/dashboard/generate" : "/auth"}>
                    Start Generating Free <ArrowRight className="ml-2 w-5 h-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="h-14 px-10 text-lg font-bold rounded-full border-2 hover:bg-secondary">
                  <Link href="/help">View Documentation</Link>
                </Button>
              </div>

              {/* Trust Badge / Proof */}
              <div className="mt-20 pt-8 border-t border-border/50 w-full">
                <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-8">Powering modern data workflows</p>
                <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale transition-all hover:grayscale-0">
                  <div className="flex items-center gap-2 font-bold text-xl"><Zap className="w-6 h-6 border-none" /> FAST</div>
                  <div className="flex items-center gap-2 font-bold text-xl"><ShieldCheck className="w-6 h-6 border-none" /> SECURE</div>
                  <div className="flex items-center gap-2 font-bold text-xl"><Database className="w-6 h-6 border-none" /> ACCURATE</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24 md:py-32 bg-secondary/30">
          <div className="container-responsive">
            <div className="text-center mb-16 md:mb-24">
              <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-foreground tracking-tight">
                Enterprise-Grade <span className="text-primary">Extraction</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Everything you need to generate, manage, and deploy synthetic data with state-of-the-art AI.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <div key={feature.name} className="modern-card group p-8 hover:-translate-y-2 transition-all">
                  <div className="flex flex-col items-start gap-6">
                    <div className="p-4 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-inner">
                      <feature.icon className="w-8 h-8" />
                    </div>
                    <div>
                      <h3 className="font-headline text-2xl font-bold mb-3 text-foreground tracking-tight">{feature.name}</h3>
                      <p className="text-muted-foreground text-base leading-relaxed">{feature.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Solutions Section */}
        <section id="solutions" className="py-24 md:py-32">
          <div className="container-responsive">
            <div className="flex flex-col lg:flex-row justify-between items-end gap-8 mb-16 md:mb-24">
              <div className="max-w-2xl">
                <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black mb-6 text-foreground tracking-tight">
                  Tailored Intelligence for <span className="text-gradient-purple">Every Industry</span>
                </h2>
                <p className="text-xl text-muted-foreground leading-relaxed">
                  Synthara adapts to your specific needs with industry-leading accuracy and performance.
                </p>
              </div>
              <Button size="lg" variant="link" className="text-primary font-bold group">
                Explore All Use Cases <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="glass-modern p-10 hover:border-primary/50 transition-colors">
                  <h3 className="font-headline text-2xl font-bold mb-6 text-foreground tracking-tight">{useCase.title}</h3>
                  <ul className="space-y-4">
                    {useCase.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <div className="mt-1 mr-4 rounded-full p-1 bg-primary/20 text-primary">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="text-muted-foreground text-base">{item}</span>
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
        <section id="team" className="py-24 md:py-32 bg-secondary/30 relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-black opacity-[0.03]" />
          <div className="container-responsive relative z-10">
            <div className="text-center mb-16 md:mb-24">
              <div className="inline-block rounded-full px-6 py-2 mb-6 bg-background border shadow-sm">
                <span className="font-bold text-sm tracking-widest text-primary uppercase">Meet The Visionaries</span>
              </div>
              <h2 className="font-headline text-4xl sm:text-5xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
                Engineering <span className="text-primary">Future</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Passionate student developers from Govt. Eng. College Challakere (AIML) pushing the boundaries of AI.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <div key={member.name} className="modern-card group p-8 flex flex-col items-center text-center">
                  <div className="relative mb-8">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl group-hover:blur-2xl transition-all" />
                    <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                      <AvatarImage src="" alt={member.name} />
                      <AvatarFallback className="bg-muted text-primary text-3xl font-black">
                        {member.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <h3 className="font-headline text-2xl font-bold text-foreground mb-2 tracking-tight">{member.name}</h3>
                  <p className="text-primary font-bold text-sm mb-4 uppercase tracking-tighter">{member.role}</p>
                  <p className="text-muted-foreground text-sm leading-relaxed">{member.college}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-32 md:py-48 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[120px] -z-10 opacity-30" />

          <div className="container-responsive">
            <h2 className="font-headline text-5xl sm:text-6xl md:text-7xl font-black mb-8 text-foreground tracking-tight">
              Ready to Scale Your <span className="text-gradient-primary">Intelligence?</span>
            </h2>
            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
              Join the innovators building the future with Synthara. Get started today and experience the next generation of data scraping.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center">
              <Button size="lg" asChild className="h-14 px-12 text-lg font-bold rounded-full shadow-xl shadow-primary/25 hover:scale-105 transition-transform">
                <Link href={user ? "/dashboard" : "/auth"}>
                  {user ? "Go to Dashboard" : "Start for Free"}
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 px-12 text-lg font-bold rounded-full border-2 hover:bg-secondary">
                <Link href="/help">Schedule a Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
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
                  <li><Link href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</Link></li>
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
                  <li><Link href="#team" className="text-muted-foreground hover:text-primary transition-colors">Community</Link></li>
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
              © 2024 Synthara AI. All rights reserved.
            </p>
            <div className="flex gap-8">
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">Status</Link>
              <Link href="#" className="text-xs text-muted-foreground hover:text-foreground">Incident History</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


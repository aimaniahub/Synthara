
"use client"; // Needs to be client for Supabase auth check

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CheckCircle, Users, Code, Activity, School, Database, BarChart3, Zap, ShieldCheck, Settings2, ArrowRight, LogIn, Briefcase } from 'lucide-react';

import { SyntharaLogo } from '@/components/icons/SyntharaLogo';
import { Footer } from '@/components/layout/Footer';
import React, { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { User as SupabaseUser } from '@supabase/supabase-js';

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


export default function HomePage() {
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function getUser() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    }
    getUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false); 
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [supabase]);


  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="py-4 border-b border-border sticky top-0 bg-background/90 backdrop-blur-lg z-50">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" aria-label="Synthara AI Homepage">
            <SyntharaLogo className="h-10 w-auto" />
          </Link>
          <div className="space-x-3">
             <Button variant="ghost" asChild>
              <Link href="#features">Features</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="#team">Team</Link>
            </Button>
             <Button variant="ghost" asChild>
              <Link href="/help">Help Center</Link>
            </Button>
            {loading ? (
                <Button size="lg" disabled className="shadow-md">Loading...</Button>
            ) : user ? (
                <Button size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            ) : (
                <Button size="lg" asChild className="shadow-md hover:shadow-lg transition-shadow">
                    <Link href="/auth"><LogIn className="mr-2 h-5 w-5"/>Login / Sign Up</Link>
                </Button>
            )}
          </div>
        </nav>
      </header>

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative py-20 md:py-32 text-center overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-secondary/70 to-background opacity-75"></div>
          <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/50 via_transparent to_transparent"></div>
          
          <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <h1 className="font-headline text-4xl sm:text-5xl md:text-7xl font-bold mb-8 text-foreground leading-tight">
              Unlock the Power of <span className="text-primary">Synthetic Data</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-3xl mx-auto">
              Synthara AI empowers you to generate, analyze, and utilize high-quality synthetic data for your most demanding projects. Accelerate innovation, protect privacy, and build better.
            </p>
            <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
                <Button size="lg" asChild className="shadow-lg hover:shadow-xl transition-shadow !py-7 !text-lg !px-10">
                <Link href="/dashboard/generate">Start Generating Data <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="shadow-lg hover:shadow-xl transition-shadow !py-7 !text-lg !px-10">
                <Link href="#features">Explore Features</Link>
                </Button>
            </div>
            <div className="mt-16 md:mt-24 max-w-5xl mx-auto">
              <div className="relative rounded-xl shadow-heavy-lg overflow-hidden border-4 border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10">
                <div className="aspect-video flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🚀</div>
                    <p className="text-lg">Synthara AI Platform</p>
                    <p className="text-sm">Advanced Data Generation</p>
                  </div>
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Purpose & Vision Block */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold mb-6 text-foreground">
                Our Purpose & Vision
              </h2>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                We believe in a future where data is abundant, accessible, and privacy-preserving. Synthara AI is built to democratize data-driven innovation by providing powerful, intuitive tools for synthetic data.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: 'Accelerate Innovation', description: 'Break data bottlenecks and fuel faster development cycles.', icon: Zap },
                { title: 'Enhance Privacy', description: 'Protect sensitive information while enabling data exploration.', icon: ShieldCheck },
                { title: 'Empower Decisions', description: 'Make data-informed choices with robust, customizable datasets.', icon: BarChart3 },
              ].map(benefit => (
                <Card key={benefit.title} className="shadow-xl hover:shadow-heavy-lg transition-shadow bg-card p-2">
                  <CardHeader className="items-center text-center">
                    <div className="p-4 bg-primary/10 rounded-full mb-4 inline-block">
                        <benefit.icon className="w-10 h-10 text-primary" />
                    </div>
                    <CardTitle className="font-headline text-2xl text-foreground">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">{benefit.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Key Features Overview */}
        <section id="features" className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-12 md:mb-16 text-foreground">
              Core Platform Features
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature) => (
                <Card key={feature.name} className="shadow-xl hover:shadow-heavy-lg transition-shadow bg-card transform hover:-translate-y-1">
                  <CardHeader className="flex flex-row items-start gap-4 p-6">
                    <div className="p-3 bg-primary/10 rounded-lg mt-1">
                        <feature.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="font-headline text-xl mb-1">{feature.name}</CardTitle>
                        <CardDescription className="text-muted-foreground leading-relaxed">{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Target Audience Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-12 md:mb-16 text-foreground">
              Built For Innovators Like You
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {targetAudiences.map((audience) => (
                <Card key={audience.name} className="text-center shadow-xl hover:shadow-heavy-lg transition-shadow bg-card p-4">
                  <CardHeader className="items-center">
                     <div className="p-4 bg-accent/10 rounded-full mb-4 inline-block">
                        <audience.icon className="w-12 h-12 text-accent" />
                    </div>
                    <CardTitle className="font-headline text-xl">{audience.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{audience.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases Section */}
        <section className="py-16 md:py-24 bg-secondary/50">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-12 md:mb-16 text-foreground">
              Versatile Use Cases
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {useCases.map((useCase) => (
                <Card key={useCase.title} className="shadow-xl hover:shadow-heavy-lg transition-shadow bg-card">
                  <CardHeader className="p-6">
                    <CardTitle className="font-headline text-xl text-primary">{useCase.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0">
                    <ul className="space-y-3">
                      {useCase.items.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-500 mr-2.5 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-4">
              <h3 className="text-xl font-semibold text-primary tracking-wider">AIML</h3>
              <h4 className="text-md text-muted-foreground">Government Engineering College Challakere</h4>
            </div>
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-semibold text-center mb-12 md:mb-16 text-foreground">
              Meet the Team
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member) => (
                <Card key={member.name} className="text-center shadow-xl hover:shadow-heavy-lg transition-shadow bg-card overflow-hidden">
                  <div className="aspect-square bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <div className="text-4xl mb-2">👤</div>
                      <p className="text-sm">{member.name}</p>
                    </div>
                  </div>
                  <CardHeader className="p-6">
                    <CardTitle className="font-headline text-xl">{member.name}</CardTitle>
                    <CardDescription className="text-primary">{member.role}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

         {/* Call to Action Section */}
        <section className="py-20 md:py-32 text-center bg-gradient-to-r from-primary to-accent">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-primary-foreground">
              Ready to Revolutionize Your Data Strategy?
            </h2>
            <p className="text-lg md:text-xl text-primary-foreground/90 mb-10 max-w-2xl mx-auto">
              Join thousands of innovators building the future with Synthara AI. Get started today and experience the next generation of data.
            </p>
             {loading ? (
                 <Button size="lg" disabled className="bg-background text-primary hover:bg-background/90 shadow-heavy-lg !py-7 !text-lg !px-10">Loading...</Button>
            ) : user ? (
                 <Button size="lg" variant="secondary" asChild className="bg-background text-primary hover:bg-background/90 shadow-heavy-lg hover:shadow-xl transition-shadow !py-7 !text-lg !px-10">
                    <Link href="/dashboard">Access Your Dashboard</Link>
                </Button>
            ) : (
                <Button size="lg" variant="secondary" asChild className="bg-background text-primary hover:bg-background/90 shadow-heavy-lg hover:shadow-xl transition-shadow !py-7 !text-lg !px-10">
                    <Link href="/auth">Get Started for Free</Link>
                </Button>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}


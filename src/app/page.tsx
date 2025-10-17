
"use client"; // Needs to be client for Supabase auth check

// Force dynamic rendering to prevent build-time errors
export const dynamic = 'force-dynamic'

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

  useEffect(() => {
    // Only initialize Supabase client on the client side
    const supabase = createSupabaseBrowserClient();

    // If Supabase client is not available (e.g., during build), skip auth
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function getUser() {
      try {
        if (supabase) {
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        }
      } catch (error) {
        console.warn('[HomePage] Auth check failed:', error);
      } finally {
        setLoading(false);
      }
    }
    getUser();

    const { data: authListener } = supabase?.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        setLoading(false);
      }
    }) || { data: { subscription: { unsubscribe: () => {} } } };

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);


  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 relative overflow-hidden">
      {/* Background geometric patterns */}
      <div className="absolute inset-0 opacity-20">
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="none">
          <path d="M0,0 Q250,100 500,0 T1000,0 L1000,300 Q750,200 500,300 T0,300 Z" fill="url(#gradient1)" />
          <path d="M0,700 Q250,600 500,700 T1000,700 L1000,1000 L0,1000 Z" fill="url(#gradient2)" />
          <defs>
            <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(139, 92, 246, 0.3)" />
              <stop offset="100%" stopColor="rgba(79, 70, 229, 0.3)" />
            </linearGradient>
            <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(79, 70, 229, 0.3)" />
              <stop offset="100%" stopColor="rgba(139, 92, 246, 0.3)" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      <header className="relative z-50 py-4 border-b border-white/10 backdrop-blur-md bg-white/5">
        <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" aria-label="Synthara AI Homepage" className="flex-shrink-0">
            <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto text-white" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="#features">Platform</Link>
            </Button>
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="#solutions">Solutions</Link>
            </Button>
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="#team">Resources</Link>
            </Button>
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="/help">Customers</Link>
            </Button>
            <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
              <Link href="#pricing">Pricing</Link>
            </Button>

            <Button variant="outline" asChild className="border-white/20 text-white hover:bg-white/10">
              <Link href="/help">Get Demo</Link>
            </Button>

            {loading ? (
                <Button disabled className="bg-emerald-500 hover:bg-emerald-600 text-white">Loading...</Button>
            ) : user ? (
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            ) : (
                <Button asChild className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg">
                    <Link href="/auth">Start for Free →</Link>
                </Button>
            )}

            {!loading && !user && (
              <Button variant="ghost" asChild className="text-white/80 hover:text-white hover:bg-white/10">
                <Link href="/auth">Sign In</Link>
              </Button>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center space-x-2">
            {loading ? (
                <Button size="sm" disabled className="bg-emerald-500 text-white">Loading...</Button>
            ) : user ? (
                <Button size="sm" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
                    <Link href="/dashboard">Dashboard</Link>
                </Button>
            ) : (
                <Button size="sm" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white">
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
                <h1 className="font-headline text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-6 text-white leading-tight">
                  Secure secrets.<br />
                  Prevent breaches.<br />
                  <span className="text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text">
                    Keep teams moving.
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-white/80 mb-8 max-w-2xl leading-relaxed">
                  Securely manage, orchestrate, and govern your secrets and non-human identities at scale with Synthara's cloud platform integrated with your favorite DevOps tools for secure workflows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button size="lg" asChild className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-xl px-8 py-4 text-lg font-semibold">
                    <Link href={user ? "/dashboard/generate" : "/auth"}>
                      Start for Free →
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Right Content - CTA */}
              <div className="relative">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-white/10 p-8 text-center">
                  <div className="space-y-6">
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-8 h-8 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white">Ready to Get Started?</h3>
                    <p className="text-white/70">
                      Join thousands of developers and data scientists who trust Synthara for their synthetic data needs.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link href="/auth">Get Started Free</Link>
                      </Button>
                      <Button asChild variant="outline" size="lg" className="border-white/20 text-white hover:bg-white/10">
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
        <section id="features" className="py-16 md:py-24 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
                Powerful Platform Features
              </h2>
              <p className="text-lg text-white/70 max-w-3xl mx-auto">
                Everything you need to generate, manage, and deploy synthetic data at scale with enterprise-grade security and performance.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {features.map((feature) => (
                <div key={feature.name} className="group bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300 hover:scale-105">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-lg">
                      <feature.icon className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-headline text-lg font-semibold mb-2 text-white">{feature.name}</h3>
                      <p className="text-white/70 text-sm leading-relaxed">{feature.description}</p>
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
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
                Built For Every Use Case
              </h2>
              <p className="text-lg text-white/70 max-w-3xl mx-auto">
                From AI training to compliance testing, Synthara adapts to your specific needs with intelligent data generation.
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {useCases.map((useCase) => (
                <div key={useCase.title} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
                  <h3 className="font-headline text-xl font-semibold text-emerald-400 mb-4">{useCase.title}</h3>
                  <ul className="space-y-3">
                    {useCase.items.map((item, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="w-5 h-5 text-emerald-400 mr-3 mt-0.5 shrink-0" />
                        <span className="text-white/80 text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Target Audience Section */}
        <section className="py-16 md:py-24 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
                Trusted by Innovators
              </h2>
              <p className="text-lg text-white/70 max-w-3xl mx-auto">
                From startups to enterprises, teams worldwide rely on Synthara for their synthetic data needs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {targetAudiences.map((audience) => (
                <div key={audience.name} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="p-4 bg-emerald-500/20 rounded-full mb-4 inline-block">
                    <audience.icon className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="font-headline text-lg font-semibold text-white mb-2">{audience.name}</h3>
                  <p className="text-white/70 text-sm">{audience.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section id="team" className="py-16 md:py-24">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8">
              <div className="inline-block bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-4">
                <span className="text-emerald-400 font-semibold text-sm">AIML • Government Engineering College Challakere</span>
              </div>
              <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
                Meet the Team
              </h2>
              <p className="text-lg text-white/70 max-w-2xl mx-auto">
                Built by passionate students dedicated to advancing AI and synthetic data technology.
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {teamMembers.map((member) => (
                <div key={member.name} className="text-center bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-300">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-emerald-400/20 to-cyan-400/20 flex items-center justify-center border-2 border-emerald-400/30 mx-auto mb-4">
                    <div className="text-2xl">👤</div>
                  </div>
                  <h3 className="font-headline text-lg font-semibold text-white mb-1">{member.name}</h3>
                  <p className="text-emerald-400 text-sm font-medium">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Call to Action Section */}
        <section className="py-20 md:py-32 text-center bg-gradient-to-r from-emerald-600 to-cyan-600">
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="font-headline text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-white">
              Ready to Transform Your Data Strategy?
            </h2>
            <p className="text-lg md:text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join thousands of innovators building the future with Synthara AI. Get started today and experience the next generation of synthetic data.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {loading ? (
                <Button size="lg" disabled className="bg-white text-emerald-600 hover:bg-white/90 shadow-xl px-8 py-4 text-lg font-semibold">
                  Loading...
                </Button>
              ) : user ? (
                <Button size="lg" asChild className="bg-white text-emerald-600 hover:bg-white/90 shadow-xl px-8 py-4 text-lg font-semibold">
                  <Link href="/dashboard">Access Your Dashboard</Link>
                </Button>
              ) : (
                <Button size="lg" asChild className="bg-white text-emerald-600 hover:bg-white/90 shadow-xl px-8 py-4 text-lg font-semibold">
                  <Link href="/auth">Get Started for Free</Link>
                </Button>
              )}
              <Button size="lg" variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 px-8 py-4 text-lg font-semibold">
                <Link href="/help">Schedule Demo</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-black/20 backdrop-blur-sm border-t border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="md:col-span-1">
              <Link href="/" className="inline-block mb-4">
                <SyntharaLogo className="h-8 w-auto text-white" />
              </Link>
              <p className="text-white/60 text-sm mb-4">
                Generate Synthetic Data with Intelligence.
              </p>
              <p className="text-white/40 text-xs">
                © 2024 Synthara AI. All rights reserved.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><Link href="#features" className="text-white/60 hover:text-white text-sm transition-colors">Features</Link></li>
                <li><Link href="/dashboard" className="text-white/60 hover:text-white text-sm transition-colors">Dashboard</Link></li>
                <li><Link href="/dashboard/generate" className="text-white/60 hover:text-white text-sm transition-colors">Data Generation</Link></li>
                <li><Link href="/dashboard/analysis" className="text-white/60 hover:text-white text-sm transition-colors">Analytics</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><Link href="/help" className="text-white/60 hover:text-white text-sm transition-colors">Documentation</Link></li>
                <li><Link href="/help" className="text-white/60 hover:text-white text-sm transition-colors">Help Center</Link></li>
                <li><Link href="#team" className="text-white/60 hover:text-white text-sm transition-colors">About Team</Link></li>
                <li><Link href="/help" className="text-white/60 hover:text-white text-sm transition-colors">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><Link href="#" className="text-white/60 hover:text-white text-sm transition-colors">Privacy Policy</Link></li>
                <li><Link href="#" className="text-white/60 hover:text-white text-sm transition-colors">Terms of Service</Link></li>
                <li><Link href="#" className="text-white/60 hover:text-white text-sm transition-colors">Security</Link></li>
              </ul>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


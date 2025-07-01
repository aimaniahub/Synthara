
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, BookOpen, Users, Lightbulb, Search } from "lucide-react";
import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { SyntharaLogo } from "@/components/icons/SyntharaLogo";

const faqs = [
  {
    question: "What is Synthara AI?",
    answer: "Synthara AI is a platform for generating high-quality synthetic data. It allows users to create custom datasets for various purposes like AI model training, software testing, and data anonymization."
  },
  {
    question: "How do I generate data?",
    answer: "Navigate to the 'Data Generation' page, describe your data needs in the prompt field, select the data type, and click 'Generate Data'. Our AI will then create the dataset for you."
  },
  {
    question: "What kind of data can I generate?",
    answer: "Synthara supports various data types including structured tabular data, text corpuses, time series data, and custom JSON. Image data generation is coming soon."
  },
  {
    question: "Is my data secure?",
    answer: "Yes, we prioritize data security. All data processed and generated on Synthara is handled with strict security protocols. We also help you generate data that preserves privacy."
  },
  {
    question: "How can I contact support?",
    answer: "You can use the contact form on this page to reach our support team. We aim to respond to all inquiries within 24 hours."
  }
];

const tutorialCategories = [
    { name: "Getting Started", icon: Lightbulb, count: 0 },
    { name: "Data Generation Techniques", icon: BookOpen, count: 0 },
    { name: "Model Training", icon: Users, count: 0 },
    { name: "API Usage", icon: Lightbulb, count: 0 }
];

export default function HelpPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-3 sm:py-4 border-b border-border sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <nav className="container mx-auto px-3 sm:px-4 lg:px-8 flex justify-between items-center">
          <Link href="/" aria-label="Synthara AI Homepage" className="flex-shrink-0">
            <SyntharaLogo className="h-8 sm:h-9 lg:h-10 w-auto" />
          </Link>
          <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
            <Link href="/dashboard">
              <span className="hidden sm:inline">Go to Dashboard</span>
              <span className="sm:hidden">Dashboard</span>
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-grow container mx-auto px-3 sm:px-4 lg:px-8 py-8 sm:py-12">
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-headline font-bold text-foreground mb-3">Help &amp; Support Center</h1>
          <p className="text-base sm:text-lg text-muted-foreground px-4">Find answers, get help, and learn more about Synthara AI.</p>
        </div>

        <div className="mb-10 relative">
          <Input 
            type="search" 
            placeholder="Search help articles, FAQs..." 
            className="w-full max-w-2xl mx-auto pl-10 py-2.5 text-base sm:text-lg"
            aria-label="Search help"
          />
          <Search className="absolute left-1/2 -translate-x-[calc(100%_+_10rem)] sm:-translate-x-[calc(100%_+_10rem+0.25rem)] top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
        </div>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Content: FAQs and Contact Form */}
          <div className="md:col-span-2 space-y-6 sm:space-y-8 lg:space-y-10">
            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="font-headline text-xl sm:text-2xl">Frequently Asked Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {faqs.map((faq, index) => (
                    <AccordionItem value={`item-${index}`} key={index}>
                      <AccordionTrigger className="text-left hover:no-underline font-medium text-base">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="font-headline text-xl sm:text-2xl">Contact Support</CardTitle>
                <CardDescription className="text-sm sm:text-base">Can't find an answer? Reach out to our support team.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="issueCategory">Issue Category</Label>
                  <Select>
                    <SelectTrigger id="issueCategory">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="billing">Billing Inquiry</SelectItem>
                      <SelectItem value="feedback">Feedback &amp; Suggestions</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Briefly describe your issue" />
                </div>
                <div>
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" placeholder="Provide details about your issue or question" rows={5} />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
                <Button type="submit" className="w-full sm:w-auto">Send Message</Button>
                <Button variant="outline" className="w-full sm:w-auto">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Live Chat (Coming Soon)</span>
                  <span className="sm:hidden">Live Chat</span>
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Sidebar: Tutorials, Community, Feature Request */}
          <div className="space-y-6 sm:space-y-8">
            <Card>
              <CardHeader className="pb-4 sm:pb-6">
                <CardTitle className="font-headline text-lg sm:text-xl flex items-center">
                  <BookOpen className="mr-2 text-primary"/>
                  <span className="hidden sm:inline">Tutorials &amp; Documentation</span>
                  <span className="sm:hidden">Tutorials</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {tutorialCategories.map(cat => (
                     <li key={cat.name}>
                        <Link href="#" className="flex items-center justify-between text-sm text-primary hover:underline p-2 rounded-md hover:bg-muted/50 transition-colors">
                           <span className="flex items-center"><cat.icon className="mr-2 h-4 w-4"/> {cat.name}</span>
                           <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-sm">{cat.count}</span>
                        </Link>
                     </li>
                  ))}
                </ul>
                 <Button variant="outline" className="w-full mt-4" asChild>
                    <Link href="#">View All Documentation</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><Users className="mr-2 text-primary"/>Community Forum</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">
                  Connect with other Synthara users, share tips, and get help from the community.
                </p>
                <Button variant="default" className="w-full" asChild>
                  <Link href="#">Visit Forum (Coming Soon)</Link>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-headline text-xl flex items-center"><Lightbulb className="mr-2 text-primary"/>Request a Feature</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Have an idea for a new feature? Let us know!
                </p>
                <div>
                  <Label htmlFor="featureRequest" className="sr-only">Feature Request</Label>
                  <Textarea id="featureRequest" placeholder="Describe your feature idea..." rows={3}/>
                </div>
                <Button variant="secondary" className="w-full">Submit Request</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

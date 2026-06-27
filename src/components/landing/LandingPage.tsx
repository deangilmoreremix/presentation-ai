"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation } from "@/components/navigation/Navigation";
import {
  Sparkles,
  FileText,
  Palette,
  Download,
  Play,
  Zap,
  Shield,
  Users,
  Star,
  CheckCircle,
  ArrowRight,
  Github,
  ExternalLink,
  Image as ImageIcon,
  Settings as SettingsIcon
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Content Generation",
    description: "Create complete presentations on any topic with advanced AI. Watch your slides build in real-time."
  },
  {
    icon: Palette,
    title: "40+ Built-in Themes",
    description: "Choose from professionally designed themes or create your own custom themes from scratch."
  },
  {
    icon: FileText,
    title: "Rich Text Editing",
    description: "Powered by Plate Editor for comprehensive text and image handling with drag-and-drop functionality."
  },
  {
    icon: Download,
    title: "Export Anywhere",
    description: "Download your presentations as PowerPoint (.pptx) or PDF with perfect formatting preserved."
  },
  {
    icon: Play,
    title: "Presentation Mode",
    description: "Present directly from the application with smooth transitions and professional controls."
  },
  {
    icon: Shield,
    title: "Secure & Private",
    description: "Your API keys are encrypted and never stored. All processing happens securely on our servers."
  }
];

const techStack = [
  { name: "Next.js", color: "bg-black" },
  { name: "React", color: "bg-blue-500" },
  { name: "TypeScript", color: "bg-blue-600" },
  { name: "Tailwind CSS", color: "bg-cyan-500" },
  { name: "Supabase", color: "bg-green-600" },
  { name: "OpenAI", color: "bg-green-500" },
  { name: "Plate Editor", color: "bg-purple-500" },
  { name: "UploadThing", color: "bg-orange-500" }
];

const apps = [
  {
    href: "/presentation",
    icon: FileText,
    title: "AI Presentation",
    description: "Generate complete slide decks on any topic with AI, then customize with themes and rich editing.",
    cta: "Open Presentation"
  },
  {
    href: "/image-studio",
    icon: ImageIcon,
    title: "AI Image Studio",
    description: "Create, edit, and remix images with powerful AI tools — perfect for slides, blogs, and social.",
    cta: "Open Image Studio"
  },
  {
    href: "/settings",
    icon: SettingsIcon,
    title: "Settings",
    description: "Manage your API keys, theme preferences, and account in one place.",
    cta: "Open Settings"
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Star className="h-4 w-4 mr-2 fill-current" aria-hidden="true" />
                Open Source AI Presentation Generator
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Create Beautiful Presentations
              <span className="text-primary block">with AI in Minutes</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The open-source alternative to Gamma.app. Generate complete presentations on any topic,
              customize with 40+ themes, and export to PowerPoint or PDF with professional results.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/presentation" aria-label="Start creating a presentation">
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="h-5 w-5 mr-2" aria-hidden="true" />
                  Start Creating Free
                  <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
              <Link
                href="http://presentation.allweone.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View live demo (opens in new tab)"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Play className="h-5 w-5 mr-2" aria-hidden="true" />
                  View Live Demo
                  <ExternalLink className="h-5 w-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            {/* Demo Video Placeholder */}
            <div className="max-w-4xl mx-auto mb-12">
              <div
                className="aspect-video bg-muted rounded-lg flex items-center justify-center border"
                role="img"
                aria-label="Product demo video placeholder"
              >
                <div className="text-center">
                  <Play className="h-16 w-16 text-muted-foreground mx-auto mb-4" aria-hidden="true" />
                  <p className="text-muted-foreground">Demo Video Coming Soon</p>
                  <p className="text-sm text-muted-foreground">Watch how easy it is to create presentations with AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need for Perfect Presentations
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From AI-powered content generation to professional exports,
              we handle the heavy lifting so you can focus on your message.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Apps Section */}
      <section className="py-20 px-4" aria-labelledby="apps-heading">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 id="apps-heading" className="text-3xl md:text-4xl font-bold mb-4">
              One Platform. Three Powerful Apps.
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Jump straight into the tool you need — every app is included.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {apps.map((app) => (
              <Card
                key={app.href}
                className="border-0 shadow-md hover:shadow-lg transition-shadow flex flex-col"
              >
                <CardHeader>
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <app.icon className="h-6 w-6 text-primary" aria-hidden="true" />
                  </div>
                  <CardTitle className="text-xl">{app.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col justify-between">
                  <CardDescription className="text-base mb-4">
                    {app.description}
                  </CardDescription>
                  <Link href={app.href} aria-label={`${app.cta}: ${app.title}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      {app.cta}
                      <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Create professional presentations in just 4 simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">Enter Your Topic</h3>
              <p className="text-muted-foreground">
                Describe what you want to present about. Add details like audience, tone, and length.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Generates Outline</h3>
              <p className="text-muted-foreground">
                Watch as AI creates a structured outline with key points and compelling content.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize & Edit</h3>
              <p className="text-muted-foreground">
                Choose from 40+ themes, edit content, add images, and refine your presentation.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Export & Present</h3>
              <p className="text-muted-foreground">
                Download as PowerPoint or PDF, or present directly from the app.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Built with Modern Technologies
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {techStack.map((tech, index) => (
              <Badge key={index} variant="secondary" className={`${tech.color} text-white px-4 py-2`}>
                {tech.name}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powered by cutting-edge AI and modern web technologies for the best user experience.
            Fully open-source and community-driven.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Amazing Presentations?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join thousands of users who have created beautiful presentations with AI.
              Start for free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/presentation" aria-label="Start creating a presentation">
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="h-5 w-5 mr-2" aria-hidden="true" />
                  Start Creating Now
                  <ArrowRight className="h-5 w-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
              <Link
                href="https://github.com/allweonedev/presentation-ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View source on GitHub (opens in new tab)"
              >
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Github className="h-5 w-5 mr-2" aria-hidden="true" />
                  View on GitHub
                  <ExternalLink className="h-5 w-5 ml-2" aria-hidden="true" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>Open source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" aria-hidden="true" />
                <span>No data collection</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
              </div>
              <span className="font-semibold">ALLWEONE®</span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link
                href="https://discord.gg/fsMHMhAHRV"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Join Discord (opens in new tab)"
                className="hover:text-foreground"
              >
                Discord
              </Link>
              <Link
                href="https://github.com/allweonedev/presentation-ai"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="View on GitHub (opens in new tab)"
                className="hover:text-foreground"
              >
                GitHub
              </Link>
              <Link href="/presentation" className="hover:text-foreground">
                Get Started
              </Link>
            </div>
          </div>

          <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>© 2026 ALLWEONE®. Open source presentation generator. Built with ❤️ for the developer community.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
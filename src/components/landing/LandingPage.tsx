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
  Star,
  CheckCircle,
  ArrowRight,
  Github,
  ExternalLink,
  Image as ImageIcon,
  Presentation,
  Bot,
  Video,
  Mic,
  Mic2,
  BarChart3,
  PieChart,
  LineChart,
  Network,
  Layers,
  Type,
  Brush,
  Wand2,
  Globe,
  Search,
  Share2,
  Heart,
  Languages,
  Cpu,
  Database,
  Lock,
  MousePointer,
  MoveVertical,
  GitBranch,
  Gauge,
  Cloud,
  ScanSearch,
  Library,
  Sparkle,
  ImagePlus,
  Settings2,
  Workflow,
  Boxes,
  Table,
  Trophy,
  BookOpen,
} from "lucide-react";

const featureGroups = [
  {
    category: "AI Content Generation",
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    features: [
      {
        icon: Bot,
        title: "AI Agent Chat Editor",
        description: "Edit slides with natural language via a streaming LangGraph agent. Change themes, regenerate slides, replace images, and edit properties conversationally.",
      },
      {
        icon: Wand2,
        title: "Outline Generation",
        description: "AI creates a structured outline from any topic with optional web search research for up-to-date content.",
      },
      {
        icon: Sparkle,
        title: "AI Slide Generation",
        description: "Generate complete slide XML from prompts in real-time with streaming responses, or generate one slide at a time.",
      },
      {
        icon: ImagePlus,
        title: "Image-Based Slides",
        description: "Generate full-bleed AI image slides with admin-curated prompts for stunning visual presentations.",
      },
      {
        icon: Search,
        title: "Web Search Integration",
        description: "Augment AI generation with live web search to ground your presentations in current information.",
      },
      {
        icon: Cpu,
        title: "Local LLM Support",
        description: "Run with OpenAI, Ollama, or LM Studio. Detects local models automatically for offline generation.",
      },
    ],
  },
  {
    category: "Editor & Blocks",
    icon: Presentation,
    color: "from-blue-500 to-cyan-600",
    features: [
      {
        icon: Type,
        title: "Plate Rich Text Editor",
        description: "Full-featured rich text with AI, alignment, callouts, code, columns, comments, emoji, links, lists, math, media, slash commands, tables, TOC, and toggles.",
      },
      {
        icon: Boxes,
        title: "40+ Custom Block Library",
        description: "Bullet, heading, quote, button, icon-list, stats, timeline, table, pyramid, staircase, compare, pros/cons, cycle, before-after, flex-box, and more.",
      },
      {
        icon: BarChart3,
        title: "30+ Chart Types",
        description: "Bar, area, line, pie, donut, scatter, bubble, radar, histogram, heatmap, box-plot, sankey, funnel, treemap, sunburst, candlestick, waterfall, radial-bar, gauge, and more.",
      },
      {
        icon: Network,
        title: "AntV Infographics",
        description: "Convert text or prompts directly into AntV infographic DSL diagrams. Edit existing infographics inline.",
      },
      {
        icon: MoveVertical,
        title: "Drag & Drop Reordering",
        description: "Resizable sidebar with HTML5 and touch backend support. Reorder slides and blocks with intuitive drag handles.",
      },
      {
        icon: Layers,
        title: "Multi-Panel Workspace",
        description: "Slide sidebar, canvas, and right edit panel dock with Elements, Charts, Infographic, Image, Media, Background, Theme, and Global Settings tabs.",
      },
    ],
  },
  {
    category: "Image Studio",
    icon: ImageIcon,
    color: "from-pink-500 to-rose-600",
    features: [
      {
        icon: ImageIcon,
        title: "15 AI Image Workflows",
        description: "Categorized workflows across Core, Marketing, UX, Product, Social, and more. Pick a style and generate instantly.",
      },
      {
        icon: Brush,
        title: "AI Image Editor",
        description: "Background replacement, object removal, and inpainting via OpenAI edits. Upload masks and refine results.",
      },
      {
        icon: ScanSearch,
        title: "Unsplash + Pixabay",
        description: "Search stock photos from Unsplash and Pixabay. Track downloads and persist gallery to your account.",
      },
      {
        icon: Settings2,
        title: "Model & Format Controls",
        description: "Choose DALL-E, GPT-Image, or DALL-E 2 variations. Control size, quality, format, compression, and transparency.",
      },
      {
        icon: Cloud,
        title: "Responses API Multi-Turn",
        description: "Refine images across multiple turns using OpenAI's Responses API with image_generation tool calling.",
      },
    ],
  },
  {
    category: "Themes & Customization",
    icon: Palette,
    color: "from-amber-500 to-orange-600",
    features: [
      {
        icon: Palette,
        title: "40+ Built-in Themes",
        description: "Choose from professionally designed themes with isolated light/dark context per presentation.",
      },
      {
        icon: Workflow,
        title: "Custom Theme Wizard",
        description: "Multi-step creation flow with colors, design layout, font pair selection, custom font upload, and logo.",
      },
      {
        icon: Heart,
        title: "Theme Favorites & Likes",
        description: "Browse public themes, favorite the ones you love, like the best community creations, build your library.",
      },
      {
        icon: Type,
        title: "Custom Font Pairs",
        description: "Upload and pair custom fonts via UploadThing. Manage your heading/body combinations per project.",
      },
      {
        icon: Library,
        title: "Background Library",
        description: "Compact gradient, solid, and image background picker with presets and live previews.",
      },
    ],
  },
  {
    category: "Presentation & Sharing",
    icon: Play,
    color: "from-emerald-500 to-teal-600",
    features: [
      {
        icon: Play,
        title: "Present Mode",
        description: "Full-screen presentation with progress bar, mobile/social overlay, and clean professional controls.",
      },
      {
        icon: Video,
        title: "Webcam Recording",
        description: "Picture-in-picture webcam overlay, mic selection, post-recording preview, and download as MP4/WebM.",
      },
      {
        icon: Share2,
        title: "Public Sharing",
        description: "Toggle a presentation public or private and share via /share/presentation/[id]. Access-controlled editing.",
      },
      {
        icon: Download,
        title: "PowerPoint & PDF Export",
        description: "DOM-scanning export pipeline preserves styles via CSS variables. Export to .pptx or PDF with full formatting.",
      },
      {
        icon: GitBranch,
        title: "Undo / Redo History",
        description: "Step through edits safely. Duplicate presentations in one click to branch from any version.",
      },
    ],
  },
  {
    category: "Productivity & Platform",
    icon: Settings2,
    color: "from-slate-500 to-gray-700",
    features: [
      {
        icon: Languages,
        title: "Multi-language Output",
        description: "Generate presentations in multiple languages with tone and audience customization per generation.",
      },
      {
        icon: Gauge,
        title: "Model Selection",
        description: "Pick from GPT-4o-mini, GPT-4o, or local models per generation. Cost and quality tradeoffs at your fingertips.",
      },
      {
        icon: Lock,
        title: "Encrypted API Keys",
        description: "Per-user OpenAI keys encrypted client-side or server-side. Validate keys before saving. Anonymous mode supported.",
      },
      {
        icon: Database,
        title: "Supabase Auth + Storage",
        description: "Anonymous guest sessions plus Supabase auth for saved work. Server-side persistence ready to plug in.",
      },
      {
        icon: Cloud,
        title: "UploadThing Uploads",
        description: "Reliable file uploads for images, editor assets, custom fonts, and logos with signed URL delivery.",
      },
      {
        icon: BookOpen,
        title: "Open Source",
        description: "MIT-style codebase. Self-host or contribute. Full source on GitHub under allweonedev/presentation-ai.",
      },
    ],
  },
];

const techStack = [
  { name: "Next.js 14", color: "bg-black" },
  { name: "React", color: "bg-blue-500" },
  { name: "TypeScript", color: "bg-blue-600" },
  { name: "Tailwind CSS", color: "bg-cyan-500" },
  { name: "Supabase", color: "bg-green-600" },
  { name: "OpenAI", color: "bg-green-500" },
  { name: "Plate Editor", color: "bg-purple-500" },
  { name: "AntV", color: "bg-indigo-500" },
  { name: "Recharts", color: "bg-pink-500" },
  { name: "LangGraph", color: "bg-red-500" },
  { name: "UploadThing", color: "bg-orange-500" },
  { name: "LangChain", color: "bg-yellow-600" },
];

const stats = [
  { value: "18+", label: "API Endpoints" },
  { value: "30+", label: "Chart Types" },
  { value: "40+", label: "Block Components" },
  { value: "15+", label: "Image Workflows" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10" />

        <div className="container mx-auto text-center">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Star className="h-4 w-4 mr-2 fill-current" />
                Open Source AI Presentation Generator
              </Badge>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight">
              Create Beautiful Presentations
              <span className="text-primary block mt-2">with AI in Minutes</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              The open-source alternative to Gamma.app. AI agent chat, 30+ chart types, AntV infographics,
              image studio, recording, custom themes, web search, multi-language, and export to PowerPoint or PDF.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link href="/presentation/create">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Create Presentation
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="/presentation">
                <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
                  <Presentation className="h-5 w-5 mr-2" />
                  Browse Presentations
                </Button>
              </Link>
              <Link href="/image-studio">
                <Button variant="ghost" size="lg" className="w-full sm:w-auto h-14 px-8 text-lg">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Image Studio
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
              {stats.map((stat) => (
                <div key={stat.label} className="p-4 rounded-lg bg-muted/50 border">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>40+ themes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Open source</span>
              </div>
            </div>

            {/* Demo Video Placeholder */}
            <div className="max-w-5xl mx-auto mt-16">
              <div className="aspect-video bg-muted/50 rounded-xl flex items-center justify-center border shadow-inner">
                <div className="text-center">
                  <Play className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium text-muted-foreground">Demo Video Coming Soon</p>
                  <p className="text-sm text-muted-foreground">Watch how easy it is to create presentations with AI</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete Feature Set */}
      {featureGroups.map((group) => (
        <section key={group.category} className="py-20 px-4 border-t">
          <div className="container mx-auto">
            <div className="text-center mb-12">
              <div className={`inline-flex h-14 w-14 rounded-xl bg-gradient-to-br ${group.color} items-center justify-center mb-4 shadow-lg`}>
                <group.icon className="h-7 w-7 text-white" />
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3">
                {group.category}
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {group.features.length} {group.features.length === 1 ? 'feature' : 'features'} in this category
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {group.features.map((feature) => (
                <Card key={feature.title} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Use Cases / Quick Entry Points */}
      <section className="py-20 px-4 border-t bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Jump Into a Feature</h2>
            <p className="text-lg text-muted-foreground">Everything is one click away</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/presentation/create">
              <Card className="border-0 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full">
                <CardHeader>
                  <Sparkles className="h-8 w-8 text-primary mb-2" />
                  <CardTitle>Create Presentation</CardTitle>
                  <CardDescription>Start with AI from a prompt</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/image-studio">
              <Card className="border-0 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full">
                <CardHeader>
                  <ImageIcon className="h-8 w-8 text-pink-500 mb-2" />
                  <CardTitle>Image Studio</CardTitle>
                  <CardDescription>Generate or edit AI images</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/presentation">
              <Card className="border-0 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full">
                <CardHeader>
                  <Presentation className="h-8 w-8 text-blue-500 mb-2" />
                  <CardTitle>My Presentations</CardTitle>
                  <CardDescription>Browse, open, and share</CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/settings">
              <Card className="border-0 shadow-md hover:shadow-xl hover:scale-105 transition-all cursor-pointer h-full">
                <CardHeader>
                  <Settings2 className="h-8 w-8 text-slate-500 mb-2" />
                  <CardTitle>Settings</CardTitle>
                  <CardDescription>Manage your API keys</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 border-t">
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
                Describe what you want to present. Add audience, tone, length, web search, and language.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Generates Outline</h3>
              <p className="text-muted-foreground">
                AI creates a structured outline with key points, web research, and customizable options.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">Customize & Edit</h3>
              <p className="text-muted-foreground">
                Choose a theme, edit content with Plate, add charts/infographics/images, and refine via AI chat.
              </p>
            </div>

            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                4
              </div>
              <h3 className="text-xl font-semibold mb-2">Export & Present</h3>
              <p className="text-muted-foreground">
                Download as PowerPoint or PDF, present in-app with recording, or share via a public link.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 border-t bg-muted/30">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Built with Modern Technologies
          </h2>
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {techStack.map((tech) => (
              <Badge key={tech.name} variant="secondary" className={`${tech.color} text-white px-4 py-2`}>
                {tech.name}
              </Badge>
            ))}
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Powered by cutting-edge AI and modern web technologies. Fully open-source and community-driven.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Create Amazing Presentations?
            </h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join the open-source community building the future of AI presentations.
              Start for free, no credit card required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="/presentation/create">
                <Button size="lg" className="w-full sm:w-auto">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Start Creating Now
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="https://github.com/allweonedev/presentation-ai" target="_blank">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Github className="h-5 w-5 mr-2" />
                  View on GitHub
                  <ExternalLink className="h-5 w-5 ml-2" />
                </Button>
              </Link>
            </div>

            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Free to use</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Open source</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>No data collection</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Self-hostable</span>
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
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">ALLWEONE®</span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="https://discord.gg/fsMHMhAHRV" target="_blank" className="hover:text-foreground">
                Discord
              </Link>
              <Link href="https://github.com/allweonedev/presentation-ai" target="_blank" className="hover:text-foreground">
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

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePresentationState } from "@/states/presentation-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Navigation } from "@/components/navigation/Navigation";
import {
  Sparkles,
  Star,
  CheckCircle,
  ArrowRight,
  Github,
  ExternalLink,
  Presentation,
  Bot,
  Video,
  Play,
  BarChart3,
  Network,
  Layers,
  Type,
  Brush,
  Palette,
  Wand2,
  Search,
  Share2,
  Heart,
  Download,
  GitBranch,
  Cloud,
  Library,
  ImagePlus,
  Settings2,
  Workflow,
  Boxes,
  Globe,
  Languages,
  Cpu,
  Database,
  Lock,
  MoveVertical,
  Gauge,
  ScanSearch,
  Users,
  BookOpen,
} from "lucide-react";

const LANGUAGES = [
  ["en-US", "English"],
  ["pt", "Portuguese"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["de", "German"],
  ["it", "Italian"],
  ["ja", "Japanese"],
  ["ko", "Korean"],
  ["zh", "Chinese"],
  ["ru", "Russian"],
  ["hi", "Hindi"],
  ["ar", "Arabic"],
] as const;

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
        icon: Sparkles,
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
    icon: ScanSearch,
    color: "from-pink-500 to-rose-600",
    features: [
      {
        icon: ImagePlus,
        title: "15 AI Image Workflows",
        description: "Categorized workflows across Core, Marketing, UX, Product, Social, and more. Pick a style and generate instantly.",
      },
      {
        icon: Brush,
        title: "AI Image Editor",
        description: "Background replacement, object removal, and inpainting via OpenAI edits. Upload masks and refine results.",
      },
      {
        icon: Globe,
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
    icon: Workflow,
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
        icon: Sparkles,
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

const examples = [
  { emoji: "⚡", title: "The Future of Artificial Intelligence in Engineering", slides: "5 slides", language: "English" },
  { emoji: "🌍", title: "Sustainable Materials for Construction Projects", slides: "5 slides", language: "English" },
  { emoji: "🎯", title: "Best Practices for Project Management in Engineering", slides: "5 slides", language: "English" },
  { emoji: "🤖", title: "Advancements in Robotics and Automation", slides: "5 slides", language: "English" },
  { emoji: "🌱", title: "Innovations in Renewable Energy Technology", slides: "5 slides", language: "English" },
  { emoji: "🔒", title: "Cybersecurity Challenges in Engineering Systems", slides: "5 slides", language: "English" },
];

const pricingTiers = [
  {
    name: "Plus",
    price: "$8",
    period: "per month",
    description: "Affordable shared credits for everyday AI work",
    features: ["1,600 shared credits per month", "Chat, notebooks, and presentations", "Image generation from the same pool", "Buy extra credits anytime"],
    href: "/billing",
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Pro",
    price: "$20",
    period: "per month",
    description: "The main plan for regular creation across the product",
    features: ["4,000 shared credits per month", "Document-aware chat", "Presentation and notebook workflows", "Shared top-ups that never expire", "Best fit for most users"],
    href: "/billing",
    cta: "Choose Pro",
    highlighted: true,
  },
  {
    name: "Max",
    price: "$80",
    period: "per month",
    description: "A larger credit pool for power users and heavy workflows",
    features: ["16,000 shared credits per month", "Large presentation generation budget", "Heavy chat and notebook use", "Same unified credit accounting", "Buy extra credits anytime"],
    href: "/billing",
    cta: "Choose Max",
    highlighted: false,
  },
];

export default function LandingPage() {
  const router = useRouter();
  const { resolvedTheme } = usePresentationState();
  const [localPrompt, setLocalPrompt] = useState("");
  const [numSlides, setNumSlides] = useState("5");
  const [language, setLanguage] = useState("en-US");
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const slidesOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => `${index + 1}`),
    [],
  );

  const handleGenerate = async () => {
    if (!localPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const createTheme = resolvedTheme === "dark" ? "ebony" : "mystique";
      const params = new URLSearchParams({
        prompt: localPrompt.trim(),
        language,
        noOfSlides: numSlides,
        webSearch: webSearchEnabled ? "true" : "false",
      });
      router.push(`/presentation/create?${params.toString()}`);
    } catch (error) {
      console.error(error);
      setIsGenerating(false);
    }
  };

  const handleExampleClick = (example: typeof examples[0]) => {
    setLocalPrompt(example.title);
    setNumSlides(example.slides.split(" ")[0]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section with Inline Prompt Input */}
      <section className="py-20 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 dark:bg-grid-slate-900 bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] -z-10" />

        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-center mb-6">
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Star className="h-4 w-4 mr-2 fill-current" />
                Open Source AI Presentation Generator
              </Badge>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
              Create stunning presentations in seconds with AI
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform your ideas into professional presentations instantly. Just describe your topic and let AI do the rest.
            </p>

            {/* Inline Prompt Input */}
            <div className="max-w-2xl mx-auto text-left mb-6">
              <div className="rounded-2xl border border-border/60 bg-background/80 p-4 shadow-lg">
                <div className="mb-3">
                  <label className="text-sm font-semibold text-foreground mb-1 block">
                    Presentation prompt
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Describe the presentation you want to build.
                  </p>
                </div>

                <textarea
                  value={localPrompt}
                  onChange={(e) => setLocalPrompt(e.target.value)}
                  placeholder="Enter your presentation topic..."
                  className="w-full rounded-xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground outline-hidden transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-indigo-400 min-h-32 resize-none mb-4"
                  disabled={isGenerating}
                />

                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Number of Slides</div>
                    <Select value={numSlides} onValueChange={setNumSlides}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {slidesOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Language</div>
                    <Select value={language} onValueChange={setLanguage}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LANGUAGES.map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Web search</div>
                    <div className="flex h-10 items-center justify-between rounded-md border px-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Globe className="h-4 w-4" />
                        {webSearchEnabled ? "Enabled" : "Disabled"}
                      </div>
                      <Switch
                        checked={webSearchEnabled}
                        onCheckedChange={setWebSearchEnabled}
                      />
                    </div>
                  </div>
                </div>

                <Button
                  size="lg"
                  className="w-full h-12 text-base"
                  onClick={handleGenerate}
                  disabled={isGenerating || !localPrompt.trim()}
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="h-5 w-5 mr-2" />
                      Generate Presentation
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Try these examples */}
            <div className="max-w-2xl mx-auto mb-6">
              <p className="text-sm font-medium text-muted-foreground mb-3">Try these examples</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {examples.map((example) => (
                  <button
                    key={example.title}
                    onClick={() => handleExampleClick(example)}
                    className="flex items-start gap-3 rounded-lg border border-border/60 bg-background/70 p-3 text-left hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  >
                    <span className="text-lg leading-none">{example.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{example.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {example.slides} | {example.language}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Trust badges */}
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
                <span>Open source</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Powerful Features - condensed from live page */}
      <section className="py-20 px-4 border-t" id="features">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Powerful Features
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything you need to create amazing presentations
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureGroups.flatMap((group) => group.features).slice(0, 6).map((feature, index) => (
              <Card key={index} className="border-0 shadow-md hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base leading-relaxed">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Complete Feature Set (our deeper article) */}
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

      {/* Jump Into a Feature */}
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
                  <ScanSearch className="h-8 w-8 text-pink-500 mb-2" />
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

      {/* Demo Video Section */}
      <section className="py-20 px-4 border-t" id="demo">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See it in action</h2>
            <p className="text-lg text-muted-foreground mb-8">Watch how it works</p>
            <div className="aspect-video bg-muted/50 rounded-xl flex items-center justify-center border shadow-inner">
              <div className="text-center">
                <Play className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-medium text-muted-foreground">Demo video placeholder</p>
                <p className="text-sm text-muted-foreground">YouTube embed would go here</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 border-t bg-muted/30" id="pricing">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              One subscription covers chat, notebooks, presentations, and images.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <Card key={tier.name} className={`border-0 shadow-md ${tier.highlighted ? "ring-2 ring-primary relative" : ""}`}>
                {tier.highlighted && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Most Popular</Badge>
                )}
                <CardHeader>
                  <CardTitle className="text-2xl">{tier.name}</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={tier.highlighted ? "default" : "outline"}
                    asChild
                  >
                    <Link href={tier.href}>{tier.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Community CTA */}
      <section className="py-20 px-4 border-t" id="community">
        <div className="container mx-auto text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Join our Community</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Share your ideas, ask questions, and collaborate with other developers. The fastest growing community for AI web agents.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Link href="https://discord.gg/232cdU5Z" target="_blank">
                <Button size="lg" variant="outline">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Join Discord
                </Button>
              </Link>
              <a href="https://x.com/AllweoneAi" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="ghost">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Follow @allweone
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Open Source Section */}
      <section className="py-20 px-4 border-t bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Open Source</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Why we're open source</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Transparency</h3>
              <p className="text-sm text-muted-foreground">
                Our code is open for everyone to see, review, and improve. No black boxes or hidden agendas.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Community-Driven</h3>
              <p className="text-sm text-muted-foreground">
                We believe in the power of community collaboration to create better software for everyone.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Education</h3>
              <p className="text-sm text-muted-foreground">
                Learn from our codebase, contribute to it, and grow your skills while helping others.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4 mx-auto">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Free Forever</h3>
              <p className="text-sm text-muted-foreground">
                Our core features will always remain free and open source, ensuring accessibility for everyone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-20 px-4 border-t">
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
          <div className="flex flex-col md:flex-row justify-between items-center mb-8">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold">ALLWEONE®</span>
            </div>

            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link href="https://discord.gg/232cdU5Z" target="_blank" className="hover:text-foreground">
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

          <p className="text-center text-sm text-muted-foreground">
            © 2024 ALLWEONE®. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

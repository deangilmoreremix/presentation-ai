"use client";

import { createBlankPresentation, createEmptyPresentation } from "@/app/_actions/notebook/presentation/presentationActions";
import { fetchPresentations } from "@/app/_actions/notebook/presentation/fetchPresentations";
import { ModelPicker } from "@/components/notebook/presentation/components/ModelPicker";
import { CreateThemeModal } from "@/components/notebook/presentation/components/theme/create-theme/CreateThemeModal";
import { ThemeModal } from "@/components/notebook/presentation/components/theme/ThemeModal";
import { SaveStatus } from "@/components/presentation/buttons/SaveStatus";
import { useThemePanelState } from "@/components/presentation/edit-panel/sections/theme/theme-panel-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ImageSourceSelector } from "@/components/ui/image-source-selector";
import { ThemeCard } from "@/components/presentation/edit-panel/sections/theme/ThemeCard";
import { Label } from "@/components/ui/label";
import { themes } from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FilePlus2, Globe, Loader2, Palette, Presentation, Sparkles, Wand2, Plus } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { toast } from "sonner";

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

const TONE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "general", label: "General" },
  { id: "persuasive", label: "Persuasive" },
  { id: "inspiring", label: "Inspiring" },
  { id: "instructive", label: "Instructive" },
  { id: "engaging", label: "Engaging" },
] as const;

const AUDIENCE_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "general", label: "General" },
  { id: "business", label: "Business" },
  { id: "investor", label: "Investor" },
  { id: "teacher", label: "Teacher" },
  { id: "student", label: "Student" },
] as const;

const SCENARIO_OPTIONS = [
  { id: "auto", label: "Auto" },
  { id: "general", label: "General" },
  { id: "analysis-report", label: "Analysis Report" },
  { id: "teaching-training", label: "Teaching" },
  { id: "promotional-materials", label: "Promotional" },
  { id: "public-speeches", label: "Public Speeches" },
] as const;

const STYLE_OPTIONS = [
  { id: "professional", label: "Professional" },
  { id: "casual", label: "Casual" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
] as const;

const TEXT_CONTENT_OPTIONS = [
  { id: "minimal", label: "Minimal" },
  { id: "concise", label: "Concise" },
  { id: "detailed", label: "Detailed" },
  { id: "extensive", label: "Extensive" },
] as const;

export function PresentationDashboard() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const { setOpenCreateThemeModal } = useThemePanelState();
  const {
    presentationInput,
    setPresentationInput,
    language,
    setLanguage,
    modelId,
    modelProvider,
    numSlides,
    setNumSlides,
    webSearchEnabled,
    setWebSearchEnabled,
    setCurrentPresentation,
    setPendingCreateRequest,
    setTheme,
    theme,
    tone,
    setTone,
    audience,
    setAudience,
    scenario,
    setScenario,
    textContent,
    setTextContent,
    presentationStyle,
    setPresentationStyle,
    imageModel,
    setImageModel,
    imageSource,
    setImageSource,
    stockImageProvider,
    setStockImageProvider,
  } = usePresentationState();

  const { data, isLoading } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => fetchPresentations(0),
  });

  const items = data?.items ?? [];
  const slidesOptions = useMemo(
    () => Array.from({ length: 20 }, (_, index) => `${index + 1}`),
    [],
  );

  const themeEntries = useMemo(
    () => Object.entries(themes).slice(0, 6),
    [],
  );
  const currentTheme =
    themes[theme as keyof typeof themes] ?? themes.mystique;
  const fallbackTheme =
    resolvedTheme === "dark" ? "ebony" : "mystique";
  const fallbackThemeOption =
    themes[fallbackTheme as keyof typeof themes] ?? themes.mystique;

  const createPresentation = async () => {
    const prompt = presentationInput.trim();
    if (!prompt) {
      toast.error("Please enter a prompt first");
      return;
    }

    const selectedLanguage = language;
    const selectedNumSlides = numSlides;
    const selectedWebSearchEnabled = webSearchEnabled;
    const selectedTheme = (theme as string) || fallbackTheme;

    setPendingCreateRequest({
      prompt,
      language: selectedLanguage,
      modelId,
      modelProvider,
      numSlides: selectedNumSlides,
      webSearchEnabled: selectedWebSearchEnabled,
    });

    try {
      const result = await createEmptyPresentation({
        title: prompt.substring(0, 50) || "Untitled Presentation",
        theme: selectedTheme,
        language: selectedLanguage,
      });

      if (!result.success || !result.presentation) {
        toast.error(result.message ?? "Failed to create presentation");
        return;
      }

      setCurrentPresentation(result.presentation.id, result.presentation.title);
      setTheme(selectedTheme);
      router.replace(`/presentation/generate/${result.presentation.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create presentation");
    }
  };

  const createBlank = async () => {
    const title = presentationInput.trim() || "Blank presentation";
    const selectedLanguage = language;
    const selectedTheme = (theme as string) || fallbackTheme;

    try {
      const result = await createBlankPresentation(
        title,
        selectedTheme,
        selectedLanguage,
      );

      if (!result.success || !result.presentation) {
        toast.error(result.message ?? "Failed to create presentation");
        return;
      }

      setTheme(selectedTheme);
      setCurrentPresentation(result.presentation.id, result.presentation.title);
      router.replace(`/presentation/${result.presentation.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create presentation");
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6">
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)]">
        <Card className="border-border/60 bg-background/70 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Sparkles className="h-6 w-6 text-primary" />
              Create a presentation
            </CardTitle>
            <CardDescription>
              Describe your topic, pick a theme, then generate an outline you can edit before building slides.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Textarea
              value={presentationInput}
              onChange={(event) => setPresentationInput(event.target.value)}
              placeholder="Describe the presentation you want to build."
              className="min-h-32 resize-none"
            />

            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Theme</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setOpenCreateThemeModal(true)}
                    className="gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create theme
                  </Button>
                  <ThemeModal>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-sm font-medium"
                    >
                      Browse all 40+ themes
                    </Button>
                  </ThemeModal>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {themeEntries.map(([key, themeOption]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setTheme(key)}
                    className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                      (theme as string) === key
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="h-16 overflow-hidden">
                      <ThemeCard
                        theme={themeOption}
                        themeId={key}
                        isSelected={(theme as string) === key}
                        showEllipsis={false}
                        showFavoriteButton={false}
                        onSelect={() => setTheme(key)}
                      />
                    </div>
                    <div className="bg-background px-2 py-1 text-center text-xs font-medium">
                      {themeOption.name ?? key}
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Selected: {currentTheme?.name ?? fallbackThemeOption?.name}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ModelPicker />

              <div className="space-y-2">
                <Label className="text-sm font-medium">Slides</Label>
                <Select
                  value={String(numSlides)}
                  onValueChange={(value) => setNumSlides(Number(value))}
                >
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
                <Label className="text-sm font-medium">Language</Label>
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
                <Label className="text-sm font-medium">Style</Label>
                <Select
                  value={presentationStyle}
                  onValueChange={setPresentationStyle}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <ImageSourceSelector
              imageSource={imageSource}
              imageModel={imageModel}
              stockImageProvider={stockImageProvider}
              onImageSourceChange={setImageSource}
              onImageModelChange={setImageModel}
              onStockImageProviderChange={setStockImageProvider}
              className="rounded-lg border bg-background/40 p-4"
              showLabel={true}
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Content depth</Label>
                <Select
                  value={textContent}
                  onValueChange={(value) =>
                    setTextContent(
                      value as "minimal" | "concise" | "detailed" | "extensive",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEXT_CONTENT_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(value) =>
                    setTone(
                      value as
                        | "auto"
                        | "general"
                        | "persuasive"
                        | "inspiring"
                        | "instructive"
                        | "engaging",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TONE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Audience</Label>
                <Select
                  value={audience}
                  onValueChange={(value) =>
                    setAudience(
                      value as
                        | "auto"
                        | "general"
                        | "business"
                        | "investor"
                        | "teacher"
                        | "student",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Scenario</Label>
                <Select
                  value={scenario}
                  onValueChange={(value) =>
                    setScenario(
                      value as
                        | "auto"
                        | "general"
                        | "analysis-report"
                        | "teaching-training"
                        | "promotional-materials"
                        | "public-speeches",
                    )
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCENARIO_OPTIONS.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 px-4 py-3">
              <div className="flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium">Web search</p>
                  <p className="text-xs text-muted-foreground">
                    Augment outline with live web results
                  </p>
                </div>
              </div>
              <Switch
                checked={webSearchEnabled}
                onCheckedChange={setWebSearchEnabled}
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void createPresentation()}
                disabled={!presentationInput.trim()}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                Generate outline
              </Button>
              <Button
                variant="outline"
                onClick={() => void createBlank()}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Blank presentation
              </Button>
              <SaveStatus className="ml-auto text-xs text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/70 shadow-xs">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Presentation className="h-5 w-5 text-primary" />
              Recent presentations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading presentations...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
                No presentations yet.
              </div>
            ) : (
              items.slice(0, 8).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => router.push(`/presentation/${item.id}`)}
                  className="flex w-full flex-col rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
                >
                  <span className="font-medium">
                    {item.title || "Untitled Presentation"}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    Updated{" "}
                    {formatDistanceToNow(new Date(item.updatedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </button>
              ))
            )}
          </CardContent>
        </Card>
      </section>

      <CreateThemeModal />
    </div>
  );
}

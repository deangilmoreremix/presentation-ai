"use client";

import { createBlankPresentation } from "@/app/_actions/notebook/presentation/presentationActions";
import { fetchPresentations } from "@/app/_actions/notebook/presentation/fetchPresentations";
import { ModelPicker } from "@/components/notebook/presentation/components/ModelPicker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageSourceSelector } from "@/components/ui/image-source-selector";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { themes } from "@/lib/presentation/themes";
import { usePresentationState } from "@/states/presentation-state";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { FilePlus2, Globe, Loader2, Presentation, Sparkles } from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
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

export function PresentationDashboard() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [isCreating, setIsCreating] = useState(false);
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
    theme,
    setTheme,
    pageStyle,
    setPageStyle,
    presentationStyle,
    setPresentationStyle,
    tone,
    setTone,
    audience,
    setAudience,
    scenario,
    setScenario,
    imageSource,
    setImageSource,
    imageModel,
    setImageModel,
    stockImageProvider,
    setStockImageProvider,
    setCurrentPresentation,
    setPendingCreateRequest,
    resetPresentationState,
  } = usePresentationState();

  const { data, isLoading } = useQuery({
    queryKey: ["presentations"],
    queryFn: () => fetchPresentations(0),
  });

  const items = data?.items ?? [];
  const slidesOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => `${index + 1}`),
    [],
  );

  const createPresentation = async () => {
    setIsCreating(true);
    const prompt = presentationInput.trim();
    const selectedLanguage = language;
    const selectedNumSlides = numSlides;
    const selectedWebSearchEnabled = webSearchEnabled;
    resetPresentationState();

    try {
      setPendingCreateRequest({
        prompt,
        language: selectedLanguage,
        modelId,
        modelProvider,
        numSlides: selectedNumSlides,
        webSearchEnabled: selectedWebSearchEnabled,
      });
      router.push("/presentation/create");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create presentation");
    } finally {
      setIsCreating(false);
    }
  };

  const createBlank = async () => {
    if (isCreating) {
      return;
    }

    setIsCreating(true);
    const title = presentationInput.trim() || "Blank presentation";
    const selectedLanguage = language;

    try {
      const theme = resolvedTheme === "dark" ? "ebony" : "mystique";
      const result = await createBlankPresentation(
        title,
        theme,
        selectedLanguage,
      );

      if (!result.success || !result.presentation) {
        toast.error(result.message ?? "Failed to create presentation");
        return;
      }

      setTheme(theme);
      setCurrentPresentation(result.presentation.id, result.presentation.title);
      router.replace(`/presentation/${result.presentation.id}`);
    } catch (error) {
      console.error(error);
      toast.error("Failed to create presentation");
    } finally {
      setIsCreating(false);
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
          </CardHeader>
          <CardContent className="space-y-5">
            <Textarea
              value={presentationInput}
              onChange={(event) => setPresentationInput(event.target.value)}
              placeholder="Describe the presentation you want to build."
              className="min-h-36 resize-none"
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <ModelPicker />

              <div className="space-y-2">
                <div className="text-sm font-medium">Slides</div>
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

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void createPresentation()}
                disabled={isCreating || !presentationInput.trim()}
              >
                {isCreating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                Generate outline
              </Button>
              <Button
                variant="outline"
                onClick={() => void createBlank()}
                disabled={isCreating}
              >
                <FilePlus2 className="mr-2 h-4 w-4" />
                Blank presentation
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-background/70 shadow-xs">
          <CardHeader>
            <CardTitle className="text-xl">Customization</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Theme</Label>
              <Select value={theme} onValueChange={(value) => setTheme(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a theme" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(themes).map(([key, themeOption]) => (
                    <SelectItem key={key} value={key}>
                      {themeOption.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Page Style</Label>
                <Select value={pageStyle} onValueChange={setPageStyle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select page style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default</SelectItem>
                    <SelectItem value="modern">Modern</SelectItem>
                    <SelectItem value="minimal">Minimal</SelectItem>
                    <SelectItem value="classic">Classic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Presentation Style</Label>
                <Select
                  value={presentationStyle}
                  onValueChange={setPresentationStyle}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select presentation style" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">
                      Professional
                    </SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                    <SelectItem value="creative">Creative</SelectItem>
                    <SelectItem value="academic">Academic</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Tone</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select tone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="persuasive">Persuasive</SelectItem>
                    <SelectItem value="inspiring">Inspiring</SelectItem>
                    <SelectItem value="instructive">Instructive</SelectItem>
                    <SelectItem value="engaging">Engaging</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Audience</Label>
                <Select value={audience} onValueChange={setAudience}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="investor">Investor</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label className="text-sm font-medium">Scenario</Label>
                <Select value={scenario} onValueChange={setScenario}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select scenario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="analysis-report">Analysis Report</SelectItem>
                    <SelectItem value="teaching-training">Teaching</SelectItem>
                    <SelectItem value="promotional-materials">
                      Promotional
                    </SelectItem>
                    <SelectItem value="public-speeches">
                      Public Speeches
                    </SelectItem>
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
              showLabel={true}
            />
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
    </div>
  );
}

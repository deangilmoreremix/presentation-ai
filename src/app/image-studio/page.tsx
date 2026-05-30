import { ImageStudio } from "@/components/image/ImageStudio";
import { ImageEditor } from "@/components/image/ImageEditor";

interface ImageStudioPageProps {
  searchParams: Promise<{ tab?: "generate" | "edit" }>;
}

export default async function ImageStudioPage({ searchParams }: ImageStudioPageProps) {
  const { tab = "generate" } = await searchParams;

  return (
    <div className="flex flex-col h-screen">
      <div className="border-b px-4 py-2">
        <h1 className="text-2xl font-bold">AI Image Studio</h1>
        <p className="text-sm text-muted-foreground">
          Generate and edit images with OpenAI's latest models
        </p>
      </div>
      <div className="flex-1">{tab === "edit" ? <ImageEditor /> : <ImageStudio />}</div>
    </div>
  );
}
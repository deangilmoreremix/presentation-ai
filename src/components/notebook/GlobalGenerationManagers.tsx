"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// The generation manager pulls in the entire AI generation pipeline
// (@ai-sdk/react, the presentation-state store with Plate/LangChain parsers,
// image-studio actions, etc.). It is only needed on presentation editor and
// generate routes and renders no UI. Load it lazily and only on those routes
// so it stays out of the initial compile/load graph for the landing page and
// other lightweight routes — otherwise cold-compiling that graph makes every
// page take 30–160s to load.
const PresentationGenerationManager = dynamic(
  () =>
    import(
      "@/components/notebook/presentation/components/PresentationGenerationManager"
    ).then((m) => m.PresentationGenerationManager),
  { ssr: false },
);

export function GlobalGenerationManagers() {
  const pathname = usePathname();

  const isPresentationRoute =
    pathname.startsWith("/presentation") ||
    pathname.startsWith("/notebook");

  if (!isPresentationRoute) {
    return null;
  }

  return <PresentationGenerationManager />;
}

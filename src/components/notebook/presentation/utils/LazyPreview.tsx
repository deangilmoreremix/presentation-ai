"use client";

import { type ReactNode, lazy, Suspense, memo, useMemo } from "react";

const PreviewFallback = () => (
  <div className="flex h-full w-full items-center justify-center">
    <div className="h-full w-full animate-pulse rounded bg-muted" />
  </div>
);

interface LazyPreviewProps {
  name: string;
  className?: string;
}

const LazyPreview = memo(function LazyPreview({
  name,
  className,
}: LazyPreviewProps) {
  const Component = useMemo(
    () =>
      lazy(() =>
        import("./template-previews").then((module) => ({
          default: module[name as keyof typeof module] as React.ComponentType<{ className?: string }>,
        })),
      ),
    [name],
  );

  return (
    <Suspense fallback={<PreviewFallback />}>
      <Component />
    </Suspense>
  );
});

export default LazyPreview;

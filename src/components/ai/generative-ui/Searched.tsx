import { ChevronsUpDownIcon, Loader2, SearchIcon } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

export interface SearchResult {
  url: string;
  title: string;
  published_date: string;
  content: string;
}

export function Searching({ query }: { query: string }) {
  return (
    <div className="mb-2 w-full rounded-lg border border-primary/20 bg-background">
      <div className="flex h-12 items-center gap-3 px-4 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            Searching the web for &quot;{query}&quot;
          </p>
        </div>
      </div>
    </div>
  );
}

export function Searched({
  results,
  query,
}: {
  results: SearchResult[];
  query: string;
}) {
  return (
    <Collapsible className="mb-2 w-full rounded-lg border border-primary/20 bg-background">
      <CollapsibleTrigger asChild>
        <Button variant="ghost" className="h-12 w-full justify-between px-4">
          <div className="flex w-[90%] min-w-0 items-center gap-3">
            <SearchIcon className="size-5 shrink-0" />
            <div className="flex min-w-0 flex-col items-start overflow-hidden">
              <span className="w-full truncate text-sm font-medium">
                {query}
              </span>
              <span className="text-xs text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"} found
              </span>
            </div>
          </div>
          <ChevronsUpDownIcon className="size-5 shrink-0 transition-transform duration-300 data-[state=open]:rotate-180" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="grid max-w-full grid-cols-1 gap-y-2 p-4">
        {results.map((result) => {
          let domain = "allweone.com";
          try {
            domain = new URL(result.url || "https://allweone.com").hostname;
          } catch {
            domain = "allweone.com";
          }
          const faviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;

          return (
            <div
              key={result.url || `${query}-${result.title}`}
              className="flex max-w-full items-start gap-3 rounded-lg border border-primary/20 p-3"
            >
              <Image
                unoptimized
                width={32}
                height={32}
                src={faviconUrl}
                alt={domain}
                className="mt-1 size-4"
              />
              <div className="min-w-0 flex-1 overflow-hidden">
                <h4 className="truncate text-sm font-medium">
                  {result.title}
                </h4>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {result.content}
                </p>
                {result.url ? (
                  <a
                    href={result.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block truncate text-xs text-primary hover:underline"
                  >
                    {result.url}
                  </a>
                ) : null}
              </div>
            </div>
          );
        })}
      </CollapsibleContent>
    </Collapsible>
  );
}

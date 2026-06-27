import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="h-screen w-screen grid place-items-center px-4">
      <div className="flex flex-col items-center gap-4 max-w-md text-center">
        <h1 className="text-3xl font-semibold tracking-tight">
          404 - Page not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <Button asChild>
          <Link href="/">Go home</Link>
        </Button>
      </div>
    </div>
  );
}
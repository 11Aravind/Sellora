import Link from "next/link";
import { ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="bg-background flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="bg-muted text-muted-foreground mb-6 flex h-16 w-16 items-center justify-center rounded-2xl">
        <FileQuestion className="h-8 w-8" />
      </div>

      <h1 className="text-foreground text-4xl font-extrabold tracking-tight sm:text-5xl">
        404
      </h1>
      <h2 className="text-foreground mt-2 text-xl font-semibold">
        Page not found
      </h2>
      <p className="text-muted-foreground mt-2 max-w-md text-sm">
        Sorry, we couldn&apos;t find the page you were looking for. It might
        have been moved or removed.
      </p>

      <div className="mt-8 flex items-center gap-3">
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}

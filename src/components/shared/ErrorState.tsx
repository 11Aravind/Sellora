"use client";

import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  message?: string;
  retry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this content. Please try again.",
  retry,
  retryLabel = "Try again",
  className,
  ...props
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "border-destructive/20 bg-destructive/5 animate-in fade-in-50 flex min-h-[300px] flex-col items-center justify-center rounded-lg border p-8 text-center",
        className
      )}
      {...props}
    >
      <div className="bg-destructive/10 text-destructive flex h-12 w-12 items-center justify-center rounded-full">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="text-foreground mt-4 text-base font-semibold">{title}</h3>
      <p className="text-muted-foreground mt-1.5 max-w-sm text-sm">{message}</p>
      {retry && (
        <Button
          variant="outline"
          size="sm"
          onClick={retry}
          className="mt-6 gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          {retryLabel}
        </Button>
      )}
    </div>
  );
}

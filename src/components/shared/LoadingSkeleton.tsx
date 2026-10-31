import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "card" | "table" | "list" | "detail";
  count?: number;
}

export function LoadingSkeleton({
  variant = "card",
  count = 3,
  className,
  ...props
}: LoadingSkeletonProps) {
  if (variant === "table") {
    return (
      <div className={cn("w-full space-y-3", className)} {...props}>
        <div className="flex h-10 items-center justify-between border-b pb-2">
          <Skeleton className="h-5 w-1/4" />
          <Skeleton className="h-5 w-1/6" />
          <Skeleton className="h-5 w-1/6" />
        </div>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="border-border/50 flex h-12 items-center justify-between border-b py-2"
          >
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-1/5" />
            <Skeleton className="h-4 w-1/8" />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "list") {
    return (
      <div className={cn("w-full space-y-4", className)} {...props}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="border-border flex items-center space-x-4 rounded-lg border p-4"
          >
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (variant === "detail") {
    return (
      <div className={cn("w-full space-y-6", className)} {...props}>
        <div className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    );
  }

  // Default: card grid
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
      {...props}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border flex flex-col space-y-3 rounded-lg border p-4"
        >
          <Skeleton className="h-32 w-full rounded-md" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

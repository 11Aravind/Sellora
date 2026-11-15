import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  imageClassName?: string;
  href?: string | null;
  priority?: boolean;
}

export function BrandLogo({
  className,
  imageClassName,
  href = "/",
  priority = false,
}: BrandLogoProps) {
  const imageElement = (
    <Image
      src="/logo.png"
      alt="Sellora"
      width={304}
      height={80}
      priority={priority}
      className={cn("h-8 w-auto object-contain", imageClassName)}
    />
  );

  if (!href) {
    return <div className={cn("inline-flex items-center", className)}>{imageElement}</div>;
  }

  return (
    <Link
      href={href}
      className={cn("inline-flex items-center hover:opacity-90 transition-opacity", className)}
    >
      {imageElement}
    </Link>
  );
}

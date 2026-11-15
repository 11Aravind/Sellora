import * as React from "react";
import { BrandLogo } from "@/components/shared";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 bg-[#fbfbfe] dark:bg-background">
      <div className="mb-4 sm:mb-5 flex items-center justify-center">
        <BrandLogo imageClassName="h-9 sm:h-10 w-auto" priority />
      </div>

      <div className="w-full max-w-[410px] animate-in fade-in-50 duration-300">
        {children}
      </div>

      <footer className="mt-5 text-center text-xs text-muted-foreground/80">
        © 2026 Sellora. Secure multi-tenant authentication.
      </footer>
    </div>
  );
}

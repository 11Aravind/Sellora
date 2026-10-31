import Link from "next/link";
import { Store } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-muted/20">
      <div className="mb-8 flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
            <Store className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            SaaS Commerce
          </span>
        </Link>
      </div>

      <div className="w-full max-w-md animate-in fade-in-50 duration-300">
        {children}
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        © 2026 SaaS Commerce Platform. Secure multi-tenant authentication.
      </footer>
    </div>
  );
}

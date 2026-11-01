"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { User, LogOut, Package } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { customerLogoutAction } from "../actions";

export function CustomerNav() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserEmail(user?.email ?? null);
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <div className="h-8 w-16 animate-pulse rounded bg-muted/30" />
    );
  }

  return (
    <div className="flex items-center gap-2">
      {userEmail ? (
        <div className="flex items-center gap-3">
          <Link
            href="/orders"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">My Orders</span>
          </Link>
          <div className="flex items-center gap-2 pl-2 border-l border-border/60">
            <span className="text-xs text-muted-foreground hidden md:inline max-w-[140px] truncate" title={userEmail}>
              {userEmail}
            </span>
            <form action={customerLogoutAction}>
              <button
                type="submit"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors p-1 rounded"
                title="Sign out"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only">Logout</span>
              </button>
            </form>
          </div>
        </div>
      ) : (
        <Link
          href="/login"
          className="flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <User className="h-4 w-4" />
          <span>Sign In</span>
        </Link>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, PlusCircle, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface UserStoreItem {
  id: string;
  name: string;
  slug: string;
  role: string;
}

interface StoreSwitcherProps {
  currentSlug: string;
  stores: UserStoreItem[];
  storeName?: string;
  storeStatus?: string;
  logoUrl?: string | null;
  className?: string;
}

export function StoreSwitcher({
  currentSlug,
  stores,
  storeName,
  storeStatus,
  logoUrl,
  className,
}: StoreSwitcherProps) {
  const router = useRouter();
  const currentStore = stores.find((s) => s.slug === currentSlug) || stores[0];
  const displayName = currentStore?.name || storeName || "Store";
  const isSuspended = storeStatus === "suspended";

  const handleSelect = (slug: string) => {
    if (slug === currentSlug) return;
    router.push(`/dashboard/${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        role="combobox"
        aria-label="Select a store"
        className={cn(
          "w-full justify-between text-xs font-semibold h-auto py-2 px-2.5 bg-background hover:bg-muted/70 border border-border/80 rounded-lg cursor-pointer transition-all shadow-2xs group flex items-center gap-2.5",
          className
        )}
      >
        <div className="flex items-center gap-2.5 truncate min-w-0 flex-1">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt={displayName}
              className="h-7 w-7 rounded-md object-cover border border-border shrink-0"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-xs shadow-xs">
              <Store className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col items-start min-w-0 text-left">
            <span className="font-bold text-xs text-foreground truncate max-w-[125px] leading-tight">
              {displayName}
            </span>
            {storeStatus && (
              <span
                className={cn(
                  "text-[9px] font-extrabold tracking-wider uppercase leading-tight mt-0.5",
                  isSuspended
                    ? "text-destructive"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {storeStatus}
              </span>
            )}
          </div>
        </div>

        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[230px]">
        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
          Your Stores ({stores.length})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {stores.map((store) => {
          const isSelected = store.slug === currentSlug;
          return (
            <DropdownMenuItem
              key={store.id}
              onSelect={() => handleSelect(store.slug)}
              className="text-xs flex items-center justify-between cursor-pointer py-2"
            >
              <div className="flex flex-col truncate pr-2">
                <span className="font-medium text-foreground truncate">{store.name}</span>
                <span className="text-[10px] text-muted-foreground capitalize">Role: {store.role}</span>
              </div>
              {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => router.push("/onboarding")}
          className="text-xs cursor-pointer py-2 text-primary font-medium flex items-center gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Create new store</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

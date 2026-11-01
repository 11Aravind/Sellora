"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, PlusCircle, Store } from "lucide-react";
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
}

export function StoreSwitcher({ currentSlug, stores }: StoreSwitcherProps) {
  const router = useRouter();
  const currentStore = stores.find((s) => s.slug === currentSlug) || stores[0];

  const handleSelect = (slug: string) => {
    if (slug === currentSlug) return;
    router.push(`/dashboard/${slug}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        role="combobox"
        aria-label="Select a store"
        className="w-[200px] justify-between text-xs font-semibold h-9 bg-background/50 border border-border/80 hover:bg-muted/60 inline-flex items-center rounded-md px-3 py-2 cursor-pointer transition-colors"
      >
        <div className="flex items-center gap-2 truncate">
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-[10px]">
            <Store className="h-3 w-3" />
          </div>
          <span className="truncate">{currentStore?.name || "Select Store"}</span>
        </div>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-50" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[220px]">
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

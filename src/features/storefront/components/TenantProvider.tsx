"use client";

import * as React from "react";
import type { StorefrontTenant } from "../types";

const TenantContext = React.createContext<StorefrontTenant | null>(null);

interface TenantProviderProps {
  tenant: StorefrontTenant;
  children: React.ReactNode;
}

export function TenantProvider({ tenant, children }: TenantProviderProps) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant(): StorefrontTenant {
  const context = React.useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ShieldCheck,
  Loader2,
  Unplug,
  Check,
  RefreshCw,
  Building2,
  Calendar,
  Lock,
} from "lucide-react";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import type {
  TenantPaymentGatewayConfig,
  PaymentGatewayStatus,
  SupportedPaymentMethod,
} from "../types";
import {
  updatePaymentPreferencesAction,
  initiateRazorpayConnectAction,
  disconnectRazorpayAction,
} from "../actions";

interface PaymentSettingsViewProps {
  tenantId: string;
  tenantSlug: string;
  initialConfig: TenantPaymentGatewayConfig;
}

export function PaymentSettingsView({
  tenantId,
  initialConfig,
}: PaymentSettingsViewProps) {
  const router = useRouter();

  const [config, setConfig] = React.useState<TenantPaymentGatewayConfig>(initialConfig);
  const [isOnlineEnabled, setIsOnlineEnabled] = React.useState(initialConfig.isOnlineEnabled);
  const [isCodEnabled, setIsCodEnabled] = React.useState(initialConfig.isCodEnabled);
  const [selectedMethods, setSelectedMethods] = React.useState<SupportedPaymentMethod[]>(
    initialConfig.supportedMethods || ["card", "upi", "netbanking", "wallet"]
  );

  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);
  const [isDisconnectOpen, setIsDisconnectOpen] = React.useState(false);
  const [showPartnerModal, setShowPartnerModal] = React.useState(false);
  const [partnerMessage, setPartnerMessage] = React.useState("");

  const isConnected = config.connectionStatus === "connected";

  // Method toggle helper
  const toggleMethod = (method: SupportedPaymentMethod) => {
    setSelectedMethods((prev) =>
      prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method]
    );
  };

  // Connect Razorpay Handler
  const handleConnectRazorpay = async () => {
    try {
      setIsConnecting(true);
      const res = await initiateRazorpayConnectAction(tenantId);

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      if ("isConfigured" in res.data && !res.data.isConfigured) {
        setPartnerMessage(res.data.message);
        setShowPartnerModal(true);
        return;
      }

      if ("authUrl" in res.data && res.data.authUrl) {
        toast.info("Redirecting to Razorpay secure login...");
        window.location.href = res.data.authUrl;
      }
    } catch {
      toast.error("Failed to initiate Razorpay connection. Please try again.");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect Handler
  const handleDisconnectRazorpay = async () => {
    try {
      setIsDisconnecting(true);
      const res = await disconnectRazorpayAction(tenantId);

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      toast.success("Razorpay account disconnected.");
      setConfig((prev) => ({
        ...prev,
        connectionStatus: "disconnected",
        gatewayAccountId: null,
        isOnlineEnabled: false,
      }));
      setIsOnlineEnabled(false);
      router.refresh();
    } catch {
      toast.error("Failed to disconnect Razorpay account.");
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Save Preferences Handler
  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isOnlineEnabled && !isConnected) {
      toast.error("Please connect your Razorpay account before enabling online payments.");
      return;
    }

    if (!isOnlineEnabled && !isCodEnabled) {
      toast.error("At least one payment method (Online or COD) must remain enabled.");
      return;
    }

    try {
      setIsSaving(true);
      const res = await updatePaymentPreferencesAction(tenantId, {
        isOnlineEnabled,
        isCodEnabled,
        supportedMethods: selectedMethods,
      });

      if (!res.ok) {
        toast.error(res.message);
        return;
      }

      toast.success("Payment preferences saved successfully.");
      router.refresh();
    } catch {
      toast.error("Failed to save payment preferences.");
    } finally {
      setIsSaving(false);
    }
  };

  // Format Status Badge
  const renderStatusBadge = (status: PaymentGatewayStatus) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1.5 py-1 px-2.5 font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Connected
          </Badge>
        );
      case "connecting":
        return (
          <Badge variant="secondary" className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1.5 py-1 px-2.5 font-medium animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Connecting...
          </Badge>
        );
      case "connection_failed":
        return (
          <Badge variant="destructive" className="gap-1.5 py-1 px-2.5 font-medium">
            <AlertCircle className="h-3.5 w-3.5" />
            Connection Failed
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="outline" className="text-muted-foreground border-border gap-1.5 py-1 px-2.5 font-medium">
            <Unplug className="h-3.5 w-3.5" />
            Disconnected
          </Badge>
        );
      case "not_connected":
      default:
        return (
          <Badge variant="secondary" className="text-muted-foreground gap-1.5 py-1 px-2.5 font-medium">
            Not Connected
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* SECTION A: PAYMENT GATEWAYS & CONNECTION STATUS */}
      <Card className="border-border/80 shadow-xs">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <span>Payment Gateways</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Connect your business payment gateway to receive payments directly into your bank account.
              </CardDescription>
            </div>
            <div>{renderStatusBadge(config.connectionStatus)}</div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Razorpay Gateway Card */}
          <div className="rounded-xl border border-border/80 bg-card p-5 transition-all space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* Razorpay Brand Logo Container */}
                <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-600 dark:text-blue-400 font-black text-xl">
                  R
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-foreground">Razorpay</h3>
                    <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 border-blue-500/30">
                      Official Partner
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-w-md">
                    Accept UPI (GPay, PhonePe, Paytm), Credit & Debit cards, Netbanking, and Wallets directly from Indian & International customers.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                {isConnected ? (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isDisconnecting}
                      onClick={() => setIsDisconnectOpen(true)}
                      className="text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
                    >
                      {isDisconnecting ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Unplug className="h-3.5 w-3.5" />
                      )}
                      <span>Disconnect</span>
                    </Button>

                    <AlertDialog open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Disconnect Razorpay Account?</AlertDialogTitle>
                          <AlertDialogDescription className="text-xs space-y-2">
                            <p>
                              Disconnecting your Razorpay account will immediately disable online checkout payments for your customers on your storefront.
                            </p>
                            <p className="text-muted-foreground">
                              Customers will only be able to place orders via Cash on Delivery (if enabled) until you reconnect a payment gateway.
                            </p>
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="text-xs">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleDisconnectRazorpay}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold"
                          >
                            Confirm Disconnect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <Button
                    onClick={handleConnectRazorpay}
                    disabled={isConnecting}
                    size="sm"
                    className="text-xs font-semibold gap-2 shadow-xs"
                  >
                    {isConnecting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="h-3.5 w-3.5" />
                        <span>Connect Razorpay</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Connected Details Card */}
            {isConnected && (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-4 space-y-2 text-xs">
                <div className="font-semibold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Account Connected & Verified</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-muted-foreground pt-1">
                  {config.gatewayAccountId && (
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Account ID: <strong className="font-mono text-foreground">{config.gatewayAccountId}</strong>
                      </span>
                    </div>
                  )}
                  {config.lastConnectedAt && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        Connected:{" "}
                        <strong className="text-foreground">
                          {new Intl.DateTimeFormat("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          }).format(new Date(config.lastConnectedAt))}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* SECTION C: PAYMENT CONFIGURATION (ONLINE & COD TOGGLES) */}
      <form onSubmit={handleSavePreferences}>
        <Card className="border-border/80 shadow-xs">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span>Checkout Payment Methods</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Configure which payment options are presented to shoppers at storefront checkout.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Online Payments Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-4 bg-card">
              <div className="space-y-1 pr-4">
                <Label htmlFor="online-payments" className="text-sm font-semibold cursor-pointer">
                  Accept Online Payments
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to pay instantly using UPI, credit/debit cards, and netbanking via Razorpay.
                </p>
                {!isConnected && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium pt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Requires connected Razorpay account before enabling.
                  </p>
                )}
              </div>
              <Switch
                id="online-payments"
                checked={isOnlineEnabled}
                disabled={!isConnected}
                onCheckedChange={setIsOnlineEnabled}
              />
            </div>

            {/* Cash on Delivery (COD) Toggle */}
            <div className="flex items-center justify-between rounded-lg border border-border/70 p-4 bg-card">
              <div className="space-y-1 pr-4">
                <Label htmlFor="cod-payments" className="text-sm font-semibold cursor-pointer">
                  Cash on Delivery (COD)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Allow customers to pay in cash or via mobile payment upon delivery.
                </p>
              </div>
              <Switch
                id="cod-payments"
                checked={isCodEnabled}
                onCheckedChange={setIsCodEnabled}
              />
            </div>

            {/* Supported Payment Channels Checklist */}
            <div className="space-y-3 pt-2">
              <Label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Supported Online Payment Instruments
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { id: "upi", label: "UPI & QR Codes", desc: "Google Pay, PhonePe, Paytm, BHIM" },
                  { id: "card", label: "Credit & Debit Cards", desc: "Visa, Mastercard, RuPay, Amex" },
                  { id: "netbanking", label: "Net Banking", desc: "50+ Major Indian Banks" },
                  { id: "wallet", label: "Wallets & PayLater", desc: "Mobikwik, Freecharge, PayLater" },
                ].map((item) => (
                  <label
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-border/60 hover:bg-muted/40 cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedMethods.includes(item.id as SupportedPaymentMethod)}
                      onCheckedChange={() => toggleMethod(item.id as SupportedPaymentMethod)}
                      disabled={!isOnlineEnabled}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5 text-xs">
                      <span className="font-semibold text-foreground block">{item.label}</span>
                      <span className="text-[11px] text-muted-foreground block">{item.desc}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </CardContent>

          <CardFooter className="flex justify-end border-t border-border/50 pt-4">
            <Button type="submit" size="sm" disabled={isSaving} className="text-xs font-semibold gap-1.5">
              {isSaving ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Saving Preferences...
                </>
              ) : (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Save Payment Preferences
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* SECTION D: HELP & INDEPENDENT ACCOUNT EXPLANATION */}
      <Card className="border-border/60 bg-muted/20 shadow-none">
        <CardContent className="p-5 flex items-start gap-3 text-xs leading-relaxed text-muted-foreground">
          <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <strong className="text-foreground font-semibold block">
              Independent Store Settlement & Data Isolation
            </strong>
            <p>
              Connect your Razorpay account to receive customer payments directly into your own bank account. Your payment gateway account is managed independently by you.
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
              <Lock className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
              <span>
                All OAuth credentials are encrypted with AES-256-GCM server-side. No API keys are ever exposed in frontend client code.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner Credentials Modal when not yet configured */}
      <Dialog open={showPartnerModal} onOpenChange={setShowPartnerModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 mb-2">
              <CreditCard className="h-5 w-5" />
            </div>
            <DialogTitle className="text-lg font-bold">Razorpay Partner Setup</DialogTitle>
            <DialogDescription className="text-xs leading-relaxed space-y-2 pt-2">
              <p>{partnerMessage}</p>
              <div className="rounded-md bg-muted p-3 text-[11px] font-mono text-foreground space-y-1">
                <div>RAZORPAY_PARTNER_CLIENT_ID=ca_...</div>
                <div>RAZORPAY_PARTNER_CLIENT_SECRET=...</div>
                <div>PAYMENT_ENCRYPTION_KEY=...</div>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Once partner approval is obtained from Razorpay and configured in your environment, store owners can connect with 1-click via official OAuth.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowPartnerModal(false)}
              className="text-xs"
            >
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

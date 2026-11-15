"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/features/auth/schemas";
import { forgotPasswordAction } from "@/features/auth/actions";

type SchemaType = Parameters<typeof zodResolver>[0];

export default function ForgotPasswordPage() {
  const [isPending, startTransition] = React.useTransition();
  const [submitted, setSubmitted] = React.useState(false);

  const form = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema as unknown as SchemaType),
    defaultValues: {
      email: "",
    },
  });

  function onSubmit(values: ForgotPasswordInput) {
    startTransition(async () => {
      const result = await forgotPasswordAction(values);

      if (!result.ok) {
        toast.error("Request failed", {
          description: result.message,
        });
        return;
      }

      setSubmitted(true);
      toast.success("Reset link sent!");
    });
  }

  if (submitted) {
    return (
      <Card className="rounded-[24px] border border-border/80 bg-card p-6 sm:px-7 sm:py-6 gap-0 text-center shadow-lg shadow-slate-200/40 dark:shadow-none">
        <CardHeader className="p-0 pb-4">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 mb-2.5">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight text-foreground">
            Check your email
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1">
            If an account exists with that email address, we have sent instructions to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <Link href="/login" className="block">
            <Button
              variant="outline"
              className="w-full h-10.5 rounded-xl border-border/80 text-sm font-semibold gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-[24px] border border-border/80 bg-card p-5 sm:p-6 gap-0 shadow-lg shadow-slate-200/40 dark:shadow-none">
      <CardHeader className="p-0 pb-3 space-y-0.5">
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Reset password
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Enter your email address and we will send you a password reset link.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-2.5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    Email address
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={isPending}
                        className="pl-10 h-10 rounded-xl border-border/80 focus-visible:ring-primary/20 text-sm"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="w-full h-10 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-sm transition-all shadow-xs mt-0.5"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending link...
                </>
              ) : (
                "Send reset link"
              )}
            </Button>
          </form>
        </Form>

        <div className="text-center text-xs text-muted-foreground pt-1">
          Remember your password?{" "}
          <Link
            href="/login"
            className="font-semibold text-[#5d45fd] hover:underline ml-1"
          >
            Sign in
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

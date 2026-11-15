"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

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
import { loginSchema, type LoginInput } from "@/features/auth/schemas";
import { loginAction } from "@/features/auth/actions";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

type SchemaType = Parameters<typeof zodResolver>[0];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const [isPending, startTransition] = React.useTransition();
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema as unknown as SchemaType),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginInput) {
    startTransition(async () => {
      const result = await loginAction(values);

      if (!result.ok) {
        toast.error("Sign in failed", {
          description: result.message,
        });
        return;
      }

      toast.success("Welcome back!");
      const destination = nextPath || result.data.redirectUrl;
      router.push(destination);
      router.refresh();
    });
  }

  return (
    <Card className="rounded-[24px] border border-border/80 bg-card p-5 sm:p-6 gap-0 shadow-lg shadow-slate-200/40 dark:shadow-none">
      <CardHeader className="p-0 pb-3 space-y-0.5">
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          Sign in to your account
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Access your dashboard and manage your store.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-2.5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            {/* Email Field */}
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

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold text-foreground">
                      Password
                    </FormLabel>
                    <Link
                      href="/forgot-password"
                      className="text-xs font-semibold text-[#5d45fd] hover:underline transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        autoComplete="current-password"
                        disabled={isPending}
                        className="pl-10 pr-10 h-10 rounded-xl border-border/80 focus-visible:ring-primary/20 text-sm"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground transition-colors focus:outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Sign in button */}
            <Button
              type="submit"
              className="w-full h-10 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-sm transition-all shadow-xs mt-0.5"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>
        </Form>

        {/* Divider */}
        <div className="relative my-0">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/70" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase">
            <span className="bg-card px-2 text-muted-foreground/80 font-semibold tracking-wider">
              OR
            </span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <GoogleSignInButton
          nextPath={nextPath}
          className="w-full h-10 rounded-xl border-border/80 bg-background hover:bg-muted/50 font-medium text-sm text-foreground gap-2.5 shadow-2xs"
        />

        {/* Bottom Switch Link */}
        <div className="text-center text-xs text-muted-foreground pt-1">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-[#5d45fd] hover:underline ml-1"
          >
            Sign up
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <React.Suspense
      fallback={
        <Card className="rounded-[24px] border-border/80 p-8 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        </Card>
      }
    >
      <LoginForm />
    </React.Suspense>
  );
}

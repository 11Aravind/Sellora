"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail, Lock, User, Eye, EyeOff } from "lucide-react";

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
import { signupSchema, type SignupInput } from "@/features/auth/schemas";
import { signupAction } from "@/features/auth/actions";
import { GoogleSignInButton } from "@/features/auth/components/GoogleSignInButton";

type SchemaType = Parameters<typeof zodResolver>[0];

export default function SignupPage() {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const form = useForm<SignupInput>({
    resolver: zodResolver(signupSchema as unknown as SchemaType),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });

  function onSubmit(values: SignupInput) {
    startTransition(async () => {
      const result = await signupAction(values);

      if (!result.ok) {
        toast.error("Sign up failed", {
          description: result.message,
        });
        return;
      }

      if (result.data.requiresEmailConfirmation) {
        setConfirmationSent(true);
        toast.success("Confirmation email sent!", {
          description: "Please check your inbox to confirm your account.",
        });
      } else {
        toast.success("Account created successfully!");
        router.push("/onboarding");
        router.refresh();
      }
    });
  }

  if (confirmationSent) {
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
            We sent a verification link to your email address. Click the link to complete registration and start onboarding.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-2">
          <Link href="/login" className="block">
            <Button
              variant="outline"
              className="w-full h-10.5 rounded-xl border-border/80 text-sm font-semibold"
            >
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
          Create your account
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm text-muted-foreground">
          Start your 14-day free trial. No credit card required.
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0 space-y-2.5">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2.5">
            {/* Full Name */}
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    Full name
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <Input
                        placeholder="John Doe"
                        autoComplete="name"
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

            {/* Email Address */}
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

            {/* Password */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="gap-1">
                  <FormLabel className="text-xs font-semibold text-foreground">
                    Password
                  </FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70 pointer-events-none" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Create a password (min. 8 characters)"
                        autoComplete="new-password"
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

            {/* Create account button */}
            <Button
              type="submit"
              className="w-full h-10 rounded-xl bg-slate-950 dark:bg-white text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-100 font-semibold text-sm transition-all shadow-xs mt-0.5"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating account...
                </>
              ) : (
                "Create account"
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
          label="Continue with Google"
          nextPath="/onboarding"
          className="w-full h-10 rounded-xl border-border/80 bg-background hover:bg-muted/50 font-medium text-sm text-foreground gap-2.5 shadow-2xs"
        />

        {/* Bottom Switch Link */}
        <div className="text-center text-xs text-muted-foreground pt-1">
          Already have an account?{" "}
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
